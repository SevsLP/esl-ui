import { NextResponse } from "next/server";

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as { username?: string; password?: string };

  const user = process.env.ESL_LOGIN_USER || "";
  const pass = process.env.ESL_LOGIN_PASS || "";
  const cookieName = process.env.ESL_LOGIN_COOKIE || "esl_auth";
  const token = process.env.ESL_LOGIN_TOKEN || "";

  const ok = body.username === user && body.password === pass;

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  // httpOnly cookie
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 дней
  });

  return res;
}