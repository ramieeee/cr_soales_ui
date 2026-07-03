import { NextResponse } from "next/server";

import { createAccessToken } from "@/lib/access-token";

const COOKIE_NAME = "cr_soales_access";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const accessEmail = process.env.ACCESS_EMAIL?.trim().toLowerCase();
  const accessPassword = process.env.ACCESS_PASSWORD;
  const cookieSecret = process.env.ACCESS_COOKIE_SECRET;

  if (!accessEmail || !accessPassword || !cookieSecret) {
    return new NextResponse(
      "Missing ACCESS_EMAIL, ACCESS_PASSWORD or ACCESS_COOKIE_SECRET",
      {
        status: 500,
      },
    );
  }

  if (email !== accessEmail || password !== accessPassword) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const token = await createAccessToken(cookieSecret, SESSION_TTL_SECONDS);

  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
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
