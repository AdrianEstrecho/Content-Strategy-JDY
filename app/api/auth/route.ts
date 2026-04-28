import { NextResponse, type NextRequest } from "next/server";
import { checkPassphrase, createSession, isGateEnabled } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json({ ok: true, redirect: "/" });
  }

  let body: { passphrase?: string; from?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!body.passphrase || !checkPassphrase(body.passphrase)) {
    return NextResponse.json({ ok: false, error: "Wrong passphrase" }, { status: 401 });
  }

  const dest = body.from && body.from.startsWith("/") && !body.from.startsWith("//") ? body.from : "/";
  const cookie = await createSession();
  const res = NextResponse.json({ ok: true, redirect: dest });
  res.cookies.set({
    name: cookie.name,
    value: cookie.value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return res;
}
