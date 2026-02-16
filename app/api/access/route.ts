import { createHmac } from "crypto";
import { NextResponse } from "next/server";

const COOKIE_NAME = "cr_soles_access";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const toBase64Url = (value: Buffer) => {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const sign = (message: string, secret: string) => {
  const digest = createHmac("sha256", secret).update(message).digest();
  return toBase64Url(digest);
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  const accessPassword = process.env.ACCESS_PASSWORD;
  const cookieSecret = process.env.ACCESS_COOKIE_SECRET;

  if (!accessPassword || !cookieSecret) {
    return new NextResponse("Missing ACCESS_PASSWORD or ACCESS_COOKIE_SECRET", {
      status: 500,
    });
  }

  if (password !== accessPassword) {
    return NextResponse.redirect(new URL("/access?error=1", request.url), 303);
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const expRaw = String(expiresAt);
  const token = `${expRaw}.${sign(expRaw, cookieSecret)}`;

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
