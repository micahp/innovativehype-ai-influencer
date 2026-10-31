import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getLockedAssignment } from "@/lib/creative-assignments";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const assignment = getLockedAssignment(id);
  if (!assignment) return NextResponse.json({ error: "Unknown creative assignment ID." }, { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), assignment.boardPath));
    return new NextResponse(bytes, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Reference board is unavailable." }, { status: 404 });
  }
}
