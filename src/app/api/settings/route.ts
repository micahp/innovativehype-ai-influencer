import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ publishingPaused: z.boolean(), publishingMode: z.enum(["draft", "human_approval", "dry_run", "automatic_preapproved", "conditional_autopublish"]).optional() });

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const [paused, mode] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "publishing_paused" } }),
    prisma.systemSetting.findUnique({ where: { key: "publishing_mode" } })
  ]);
  return NextResponse.json({ publishingPaused: paused?.value ?? true, publishingMode: mode?.value ?? "human_approval", livePublishingEnabled: process.env.LIVE_PUBLISHING_ENABLED === "true" });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });
  await prisma.systemSetting.upsert({ where: { key: "publishing_paused" }, update: { value: parsed.data.publishingPaused }, create: { key: "publishing_paused", value: parsed.data.publishingPaused } });
  if (parsed.data.publishingMode) await prisma.systemSetting.upsert({ where: { key: "publishing_mode" }, update: { value: parsed.data.publishingMode }, create: { key: "publishing_mode", value: parsed.data.publishingMode } });
  await audit("admin", "publishing.settings_changed", "SystemSetting", "publishing_paused", parsed.data);
  return NextResponse.json(parsed.data);
}
