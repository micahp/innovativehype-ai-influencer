export type OptionalMetric = number | null | undefined;

export function observedFollowerInteractionRate(post: {
  likes?: OptionalMetric;
  comments?: OptionalMetric;
  shares?: OptionalMetric;
  saves?: OptionalMetric;
  followerCount?: OptionalMetric;
}) {
  const followers = post.followerCount;
  if (typeof followers !== "number" || followers <= 0) return null;
  const values = [post.likes, post.comments, post.shares, post.saves].filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return { rate: values.reduce((sum, value) => sum + value, 0) / followers, partial: values.length < 4, observedComponents: values.length };
}

export function observedExposureEngagementRate(metrics: Record<string, OptionalMetric>) {
  const exposure = typeof metrics.impressions === "number" ? metrics.impressions : metrics.reach;
  if (typeof exposure !== "number" || exposure <= 0) return { rate: null, partial: false, observedComponents: 0, exposure: null };
  const values = [metrics.likes, metrics.comments, metrics.shares, metrics.saves].filter((value): value is number => typeof value === "number");
  if (values.length === 0) return { rate: null, partial: false, observedComponents: 0, exposure };
  return { rate: values.reduce((sum, value) => sum + value, 0) / exposure, partial: values.length < 4, observedComponents: values.length, exposure };
}
