import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "cr_soles_access";

const toBase64Url = (bytes: ArrayBuffer) => {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const sign = async (message: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return toBase64Url(sig);
};

const isValidToken = async (token: string | undefined, secret: string) => {
  if (!token) return false;
  const [expRaw, signature] = token.split(".");
  if (!expRaw || !signature) return false;

  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = await sign(expRaw, secret);
  return signature === expected;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.ACCESS_COOKIE_SECRET;

  if (!secret) {
    return new NextResponse("Missing ACCESS_COOKIE_SECRET", { status: 500 });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await isValidToken(token, secret);

  if (pathname === "/access") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/access", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/access"],
};
