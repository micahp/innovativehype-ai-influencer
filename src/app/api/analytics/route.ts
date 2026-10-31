import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { observedExposureEngagementRate } from "@/lib/metrics";

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request.headers.get("cookie"))) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const posts = await prisma.publishedPost.findMany({
    where: { dryRun: false, publicationStatus: "published" },
    include: { metrics: { orderBy: { observedAt: "desc" } }, scheduledPost: { include: { contentBrief: { include: { influencer: true } } } } },
    orderBy: { publishedAt: "desc" }
  });
  const observations = posts.map((post) => {
    const metrics = Object.fromEntries(post.metrics.map((metric) => [metric.metric, metric.value]));
    const rate = observedExposureEngagementRate(metrics);
    return {
      id: post.id,
      platform: post.scheduledPost.platform,
      influencer: post.scheduledPost.contentBrief.influencer.name,
      pillar: post.scheduledPost.contentBrief.contentPillar,
      title: post.scheduledPost.contentBrief.title,
      publishedAt: post.publishedAt,
      metrics,
      engagementRate: rate.rate,
      partialEngagementMetrics: rate.partial,
      observedEngagementComponents: rate.observedComponents,
      hasExposure: rate.exposure !== null
    };
  });

  const groupMap = new Map<string, { pillar: string; posts: number; qualifiedRates: Array<{ rate: number; components: number }>; missingExposure: number }>();
  for (const row of observations) {
    const group = groupMap.get(row.pillar) ?? { pillar: row.pillar, posts: 0, qualifiedRates: [], missingExposure: 0 };
    group.posts += 1;
    if (row.engagementRate !== null) group.qualifiedRates.push({ rate: row.engagementRate, components: row.observedEngagementComponents });
    else if (!row.hasExposure) group.missingExposure += 1;
    groupMap.set(row.pillar, group);
  }
  const byPillar = [...groupMap.values()].map((group) => ({
    pillar: group.pillar,
    posts: group.posts,
    comparablePosts: group.qualifiedRates.length,
    averageObservedEngagementRate: group.qualifiedRates.length && new Set(group.qualifiedRates.map((entry) => entry.components)).size === 1 ? group.qualifiedRates.reduce((sum, entry) => sum + entry.rate, 0) / group.qualifiedRates.length : null,
    missingExposure: group.missingExposure,
    interpretation: group.qualifiedRates.length < 3 ? "Not enough exposure-qualified posts for a comparison." : new Set(group.qualifiedRates.map((entry) => entry.components)).size > 1 ? "Engagement metric coverage differs between posts; compare only with caution." : "Descriptive association only; this does not establish what caused performance."
  }));
  const recentObserved = await prisma.postMetric.aggregate({
    where: { observedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, publishedPost: { dryRun: false, publicationStatus: "published" } },
    _count: { id: true }
  });
  return NextResponse.json({
    livePublishedPosts: posts.length,
    observedMetricRows: posts.reduce((sum, post) => sum + post.metrics.length, 0),
    metricObservationsLast7Days: recentObserved._count.id,
    observations,
    byPillar,
    publishedPostsAvailableForImport: posts.map((post) => ({ id: post.id, title: post.scheduledPost.contentBrief.title, platform: post.scheduledPost.platform, publishedAt: post.publishedAt, influencer: post.scheduledPost.contentBrief.influencer.name }))
  });
}
