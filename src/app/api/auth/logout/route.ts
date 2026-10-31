import { NextResponse } from "next/server";
import { expiredSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.headers.set("set-cookie", expiredSessionCookie());
  return response;
}
