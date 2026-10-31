import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, passwordMatches, sessionCookie } from "@/lib/auth";

const schema = z.object({ password: z.string().min(1).max(512) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !passwordMatches(parsed.data.password, process.env.STUDIO_ADMIN_PASSWORD)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.headers.set("set-cookie", sessionCookie(createSessionToken()));
  return response;
}
