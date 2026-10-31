import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const metricNames = ["impressions", "reach", "views", "likes", "comments", "shares", "saves", "profile_visits", "followers_gained", "link_clicks"] as const;
const metricShape = Object.fromEntries(metricNames.map((name) => [name, z.number().nonnegative().optional()])) as Record<typeof metricNames[number], z.ZodOptional<z.ZodNumber>>;
const schema = z.object({ publishedPostId: z.string().min(1), observedAt: z.string().datetime(), metrics: z.object(metricShape).strict() });

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid metrics" }, { status: 400 });
  const post = await prisma.publishedPost.findUnique({ where: { id: parsed.data.publishedPostId } });
  if (!post) return NextResponse.json({ error: "Published post not found" }, { status: 404 });
  if (post.dryRun || post.publicationStatus !== "published") return NextResponse.json({ error: "Metrics can only be attached to a confirmed live post." }, { status: 409 });
  const values = Object.entries(parsed.data.metrics).filter((entry): entry is [string, number] => typeof entry[1] === "number");
  if (values.length === 0) return NextResponse.json({ error: "Provide at least one observed metric; unavailable values should be omitted." }, { status: 400 });
  const observedAt = new Date(parsed.data.observedAt);
  const rows = await prisma.$transaction(values.map(([metric, value]) => prisma.postMetric.create({ data: { publishedPostId: post.id, metric, value, source: "manual_import", observedAt } })));
  await audit("admin", "post_metrics.imported", "PublishedPost", post.id, { metricNames: values.map(([name]) => name), observedAt: observedAt.toISOString() });
  return NextResponse.json({ metrics: rows }, { status: 201 });
}
