import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonSafe } from "@/lib/serialize";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  const job = await prisma.generationJob.findUnique({ where: { id }, include: { assets: true } });
  if (!job) return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
  return NextResponse.json(jsonSafe({ job }));
}
