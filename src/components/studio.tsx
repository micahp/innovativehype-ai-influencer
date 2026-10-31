"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { observedFollowerInteractionRate } from "@/lib/metrics";
import CreativeDirectionReview from "@/components/creative-direction-review";

type PersonaSpec = {
  age?: number;
  positioning?: string;
  personality?: { traits?: string[]; voice?: string };
  visualIdentity?: { face?: string; hair?: string; body?: string; palette?: string[]; referenceAssetStatus?: string };
  contentPillars?: Array<{ name: string }>;
};
type AnnualPlan = { periodStart?: string; periodEnd?: string; months?: Array<{ month: string; themes: string[]; experiment: string }>; quarterlyReviews?: Array<{ quarter: string; focus: string }> };
type SocialAccount = { platform: string; status: string; externalAccountId?: string | null; handle?: string | null; tokenConfigured?: boolean; settings?: { graphVersion?: string } | null };
type Influencer = { id: string; slug: string; name: string; suggestedHandle: string; bio: string; personaVersions: Array<{ version: number; spec: PersonaSpec }>; socialAccounts: SocialAccount[]; strategies?: Array<{ plan: AnnualPlan; year: number; version: number }> };
type Asset = { id: string; outputUrl: string; provider: string; model?: string; seed?: string; reviewStatus: string; isMock: boolean };
type Brief = { id: string; influencerId: string; personaVersionId?: string | null; assignmentId?: string | null; intendedShot?: string | null; sourceSnapshot?: unknown; title: string; concept: string; platform: string; format: string; contentPillar: string; captionDraft: string; imagePrompt: string; status: string; scheduledFor: string | null; assets: Asset[]; influencer: { id: string; name: string; slug: string }; creativeAssignment?: { id: string; direction: string } | null; referencePost?: { id: string; url: string; creatorHandle?: string | null } | null; trendSignal?: { id: string; topic: string; sourceUrl: string; confidence: number } | null; scheduledPosts?: Array<{ id: string; platform: string; scheduledFor: string; status: string; publishedPost?: { id: string; dryRun: boolean } | null }> };
type CreativeAssignment = { id: string; influencerSlug: string; direction: string; status: string; integrityOk: boolean };
type IdentityReference = { id: string; influencerId: string; kind: string; status: string; sha256: string; fileUrl: string; personaVersion: { version: number } };
type ReferencePost = { id: string; url: string; platform: string; format: string; creatorHandle?: string | null; publishedAt?: string | null; caption?: string | null; description?: string | null; likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null; views?: number | null; impressions?: number | null; followerCount?: number | null; evidenceNotes?: string | null; influencer?: { id: string; name: string; slug: string } | null };
type ReferenceAccount = { id: string; platform: string; username?: string | null; profileUrl: string; niche: string; audiencePositioning: string; audienceDemographics?: string | null; followerCount?: number | null; followerCountObservedAt?: string | null; contentTypes?: string[] | null; postingFrequency?: string | null; hashtags?: string[] | null; publicEngagement?: { sampledPostUrl?: string; likes?: number; comments?: number; views?: number; observedAt?: string } | null; relevanceReason: string; collectedAt: string; influencer?: { id: string; name: string; slug: string } | null; source: { provenance: string } };
type TrendSignal = { id: string; topic: string; sourceUrl: string; sourceName: string; observedAt: string; targetAudience?: string | null; relevance: string; proposedConcept: string; estimatedProductionEffort?: string | null; recommendedWindow?: string | null; confidence: number; expiresAt?: string | null; evidence?: { note?: string } | null; influencer?: { id: string; name: string; slug: string } | null };
type Dashboard = { influencers: Influencer[]; stats: { researchCount: number; briefCount: number; pendingApprovals: number; scheduledCount: number; livePosts: number }; recentJobs: Array<{ id: string; status: string; provider: string; contentBrief: { title: string; influencer: { name: string } } }>; publishingPaused: boolean; publishingMode: string; livePublishingEnabled: boolean; activation: { finePhotoGenConfigured: boolean; mediaProvider: string; instagramConfigured: boolean; xConfigured: boolean } };
type AnalyticsData = { livePublishedPosts: number; observedMetricRows: number; metricObservationsLast7Days: number; observations: Array<{ id: string; title: string; influencer: string; platform: string; pillar: string; publishedAt: string; metrics: Record<string, number | null>; engagementRate: number | null; hasExposure: boolean }>; byPillar: Array<{ pillar: string; posts: number; comparablePosts: number; averageObservedEngagementRate: number | null; missingExposure: number; interpretation: string }>; publishedPostsAvailableForImport: Array<{ id: string; title: string; platform: string; publishedAt: string; influencer: string }> };
type Section = "overview" | "research" | "directions" | "content" | "calendar" | "analytics" | "settings";

const navItems: Array<{ id: Section; label: string; code: string }> = [
  { id: "overview", label: "Overview", code: "01" },
  { id: "research", label: "Research library", code: "02" },
  { id: "directions", label: "Direction review", code: "03" },
  { id: "content", label: "Content studio", code: "04" },
  { id: "calendar", label: "Publishing calendar", code: "05" },
  { id: "analytics", label: "Performance", code: "06" },
  { id: "settings", label: "System settings", code: "07" }
];

const emptyDashboard: Dashboard = { influencers: [], stats: { researchCount: 0, briefCount: 0, pendingApprovals: 0, scheduledCount: 0, livePosts: 0 }, recentJobs: [], publishingPaused: true, publishingMode: "human_approval", livePublishingEnabled: false, activation: { finePhotoGenConfigured: false, mediaProvider: "fine-photo-gen", instagramConfigured: false, xConfigured: false } };
const emptyAnalytics: AnalyticsData = { livePublishedPosts: 0, observedMetricRows: 0, metricObservationsLast7Days: 0, observations: [], byPillar: [], publishedPostsAvailableForImport: [] };

function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unscheduled" : new Intl.DateTimeFormat("en", options).format(date);
}

export default function Studio() {
  const [section, setSection] = useState<Section>("overview");
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [references, setReferences] = useState<ReferencePost[]>([]);
  const [referenceAccounts, setReferenceAccounts] = useState<ReferenceAccount[]>([]);
  const [trends, setTrends] = useState<TrendSignal[]>([]);
  const [creativeAssignments, setCreativeAssignments] = useState<CreativeAssignment[]>([]);
  const [identityReferences, setIdentityReferences] = useState<IdentityReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedInfluencerId, setSelectedInfluencerId] = useState("");
  const [selectedBriefId, setSelectedBriefId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedIdentityReferenceId, setSelectedIdentityReferenceId] = useState("");
  const [generationSpendConfirmed, setGenerationSpendConfirmed] = useState(false);
  const [sourceForBrief, setSourceForBrief] = useState<ReferencePost | null>(null);
  const [researchQuery, setResearchQuery] = useState("");
  const [researchPlatform, setResearchPlatform] = useState("all");
  const [researchCreator, setResearchCreator] = useState("all");
  const [sourceTrend, setSourceTrend] = useState<TrendSignal | null>(null);
  const [referenceForm, setReferenceForm] = useState({ url: "", platform: "instagram", influencerId: "", creatorHandle: "", format: "photo", caption: "", description: "", likes: "", comments: "", views: "", followerCount: "", evidenceNotes: "" });
  const [referenceAccountForm, setReferenceAccountForm] = useState({ platform: "instagram", profileUrl: "", username: "", influencerId: "", niche: "", audiencePositioning: "", audienceDemographics: "", followerCount: "", followerCountObservedAt: new Date().toISOString().slice(0, 16), contentTypes: "", postingFrequency: "", hashtags: "", sampledPostUrl: "", sampleLikes: "", sampleComments: "", sampleViews: "", sampleObservedAt: new Date().toISOString().slice(0, 16), relevanceReason: "" });
  const [trendForm, setTrendForm] = useState({ influencerId: "", topic: "", sourceUrl: "", sourceName: "", observedAt: new Date().toISOString().slice(0, 16), targetAudience: "", relevance: "", proposedConcept: "", estimatedProductionEffort: "medium", recommendedWindow: "", confidence: "", expiresAt: "", evidenceNote: "" });
  const [briefForm, setBriefForm] = useState({ influencerId: "", assignmentId: "", title: "", concept: "", platform: "instagram", format: "single_image", contentPillar: "" });
  const [scheduleTime, setScheduleTime] = useState("");
  const [metricPostId, setMetricPostId] = useState("");
  const [metricObservedAt, setMetricObservedAt] = useState(new Date().toISOString().slice(0, 16));
  const [metricForm, setMetricForm] = useState({ impressions: "", reach: "", views: "", likes: "", comments: "", shares: "", saves: "", profile_visits: "", followers_gained: "", link_clicks: "" });

  const refresh = useCallback(async () => {
    const [dashboardResponse, briefsResponse, researchResponse, accountResponse, trendResponse, analyticsResponse, assignmentResponse, identityResponse] = await Promise.all([
      fetch("/api/dashboard", { cache: "no-store" }), fetch("/api/briefs", { cache: "no-store" }), fetch("/api/research/references", { cache: "no-store" }), fetch("/api/research/accounts", { cache: "no-store" }), fetch("/api/research/trends", { cache: "no-store" }), fetch("/api/analytics", { cache: "no-store" }), fetch("/api/creative-assignments", { cache: "no-store" }), fetch("/api/identity-assets", { cache: "no-store" })
    ]);
    if ([dashboardResponse, briefsResponse, researchResponse, accountResponse, trendResponse, assignmentResponse, identityResponse].some((response) => response.status === 401)) { window.location.assign("/login"); return; }
    const [dash, briefData, researchData, accountData, trendData, analyticsData, assignmentData, identityData] = await Promise.all([dashboardResponse.json(), briefsResponse.json(), researchResponse.json(), accountResponse.json(), trendResponse.json(), analyticsResponse.json(), assignmentResponse.json(), identityResponse.json()]);
    if (!dashboardResponse.ok) throw new Error(dash.error || "Could not load studio data");
    setDashboard(dash);
    setBriefs(briefData.briefs ?? []);
    setReferences(researchData.posts ?? []);
    setReferenceAccounts(accountData.accounts ?? []);
    setTrends(trendData.trends ?? []);
    setCreativeAssignments(assignmentData.assignments ?? []);
    setIdentityReferences(identityData.assets ?? []);
    if (analyticsResponse.ok) setAnalytics(analyticsData);
    setSelectedInfluencerId((current) => current || dash.influencers[0]?.id || "");
    setSelectedBriefId((current) => current || briefData.briefs?.[0]?.id || "");
    setReferenceForm((current) => ({ ...current, influencerId: current.influencerId || dash.influencers[0]?.id || "" }));
    setReferenceAccountForm((current) => ({ ...current, influencerId: current.influencerId || dash.influencers[0]?.id || "" }));
    setTrendForm((current) => ({ ...current, influencerId: current.influencerId || dash.influencers[0]?.id || "" }));
    setBriefForm((current) => ({ ...current, influencerId: current.influencerId || dash.influencers[0]?.id || "" }));
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [refresh]);

  const selectedInfluencer = dashboard.influencers.find((item) => item.id === selectedInfluencerId) ?? dashboard.influencers[0];
  const selectedBrief = briefs.find((item) => item.id === selectedBriefId) ?? briefs[0];
  const filteredBriefs = useMemo(() => briefs.filter((item) => !selectedInfluencerId || item.influencerId === selectedInfluencerId), [briefs, selectedInfluencerId]);
  const searchText = researchQuery.trim().toLowerCase();
  const filteredReferences = useMemo(() => references.filter((post) => {
    const creatorMatches = researchCreator === "all" || (researchCreator === "shared" ? !post.influencer : post.influencer?.id === researchCreator);
    const platformMatches = researchPlatform === "all" || post.platform === researchPlatform;
    const searchMatches = !searchText || [post.url, post.creatorHandle, post.format, post.caption, post.description, post.evidenceNotes]
      .some((value) => value?.toLowerCase().includes(searchText));
    return creatorMatches && platformMatches && searchMatches;
  }), [references, researchCreator, researchPlatform, searchText]);
  const filteredReferenceAccounts = useMemo(() => referenceAccounts.filter((account) => {
    const creatorMatches = researchCreator === "all" || (researchCreator === "shared" ? !account.influencer : account.influencer?.id === researchCreator);
    const platformMatches = researchPlatform === "all" || account.platform === researchPlatform;
    const searchMatches = !searchText || [account.profileUrl, account.username, account.niche, account.audiencePositioning, account.audienceDemographics, account.relevanceReason, account.postingFrequency, ...(account.contentTypes ?? []), ...(account.hashtags ?? [])]
      .some((value) => value?.toLowerCase().includes(searchText));
    return creatorMatches && platformMatches && searchMatches;
  }), [referenceAccounts, researchCreator, researchPlatform, searchText]);
  const selectedAsset = selectedBrief?.assets.find((asset) => asset.id === selectedAssetId);
  const selectedBriefPersonaVersion = dashboard.influencers.find((person) => person.id === selectedBrief?.influencerId)?.personaVersions[0]?.version;
  const approvedIdentityReferences = identityReferences.filter((asset) => asset.influencerId === selectedBrief?.influencerId && asset.status === "approved" && asset.personaVersion.version === selectedBriefPersonaVersion);
  const selectedIdentityReference = approvedIdentityReferences.find((asset) => asset.id === selectedIdentityReferenceId);
  const approvedAssignmentsForBrief = creativeAssignments.filter((assignment) => assignment.status === "approved" && assignment.integrityOk && assignment.influencerSlug === dashboard.influencers.find((person) => person.id === briefForm.influencerId)?.slug);
  const currentPersona = selectedInfluencer?.personaVersions?.[0]?.spec;

  async function api(path: string, method = "POST", payload?: unknown) {
    const response = await fetch(path, { method, headers: payload ? { "content-type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function submitReference(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const optionalNumber = (value: string) => value.trim() === "" ? undefined : Number(value);
      const result = await api("/api/research/references", "POST", {
        ...referenceForm,
        likes: optionalNumber(referenceForm.likes), comments: optionalNumber(referenceForm.comments), views: optionalNumber(referenceForm.views), followerCount: optionalNumber(referenceForm.followerCount),
        shares: undefined, saves: undefined, impressions: undefined,
        influencerId: referenceForm.influencerId || undefined,
        creatorHandle: referenceForm.creatorHandle || undefined,
        caption: referenceForm.caption || undefined,
        description: referenceForm.description || undefined,
        evidenceNotes: referenceForm.evidenceNotes || undefined
      });
      setMessage(result.duplicate ? "That source URL is already in the research library." : "Reference saved. Missing metrics remain blank; no values were inferred.");
      setReferenceForm((current) => ({ ...current, url: "", creatorHandle: "", caption: "", description: "", likes: "", comments: "", views: "", followerCount: "", evidenceNotes: "" }));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save reference"); }
    finally { setBusy(false); }
  }

  async function submitReferenceAccount(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const numberOrUndefined = (value: string) => value.trim() === "" ? undefined : Number(value);
      const contentTypes = referenceAccountForm.contentTypes.split(",").map((value) => value.trim()).filter(Boolean);
      const hashtags = referenceAccountForm.hashtags.split(/[ ,]+/).map((value) => value.replace(/^#/, "")).filter(Boolean);
      const sampleLikes = numberOrUndefined(referenceAccountForm.sampleLikes);
      const sampleComments = numberOrUndefined(referenceAccountForm.sampleComments);
      const sampleViews = numberOrUndefined(referenceAccountForm.sampleViews);
      const hasSampleMetrics = sampleLikes !== undefined || sampleComments !== undefined || sampleViews !== undefined;
      const publicEngagement = referenceAccountForm.sampledPostUrl || sampleLikes !== undefined || sampleComments !== undefined || sampleViews !== undefined
        ? { sampledPostUrl: referenceAccountForm.sampledPostUrl || undefined, likes: sampleLikes, comments: sampleComments, views: sampleViews, observedAt: hasSampleMetrics && referenceAccountForm.sampleObservedAt ? new Date(referenceAccountForm.sampleObservedAt).toISOString() : undefined }
        : undefined;
      const result = await api("/api/research/accounts", "POST", {
        ...referenceAccountForm,
        username: referenceAccountForm.username || undefined,
        influencerId: referenceAccountForm.influencerId || undefined,
        followerCount: numberOrUndefined(referenceAccountForm.followerCount),
        followerCountObservedAt: referenceAccountForm.followerCount.trim() ? new Date(referenceAccountForm.followerCountObservedAt).toISOString() : undefined,
        contentTypes, hashtags, publicEngagement
      });
      setMessage(result.duplicate ? "That creator profile is already in the research library." : "Reference profile saved with its manual source provenance.");
      setReferenceAccountForm((current) => ({ ...current, profileUrl: "", username: "", niche: "", audiencePositioning: "", audienceDemographics: "", followerCount: "", contentTypes: "", postingFrequency: "", hashtags: "", sampledPostUrl: "", sampleLikes: "", sampleComments: "", sampleViews: "", relevanceReason: "" }));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save reference profile"); }
    finally { setBusy(false); }
  }

  async function submitTrend(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api("/api/research/trends", "POST", {
        ...trendForm,
        influencerId: trendForm.influencerId || undefined,
        targetAudience: trendForm.targetAudience || undefined,
        observedAt: new Date(trendForm.observedAt).toISOString(),
        recommendedWindow: trendForm.recommendedWindow ? new Date(trendForm.recommendedWindow).toISOString() : undefined,
        expiresAt: trendForm.expiresAt ? new Date(trendForm.expiresAt).toISOString() : undefined,
        confidence: trendForm.confidence.trim() ? Number(trendForm.confidence) / 100 : undefined
      });
      setMessage(`Trend signal saved from ${result.signal.sourceName}. The source evidence and proposed concept remain separate.`);
      setTrendForm((current) => ({ ...current, topic: "", sourceUrl: "", sourceName: "", targetAudience: "", relevance: "", proposedConcept: "", recommendedWindow: "", confidence: "", expiresAt: "", evidenceNote: "" }));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save trend signal"); }
    finally { setBusy(false); }
  }

  function prepareBrief(post?: ReferencePost) {
    const influencerId = post?.influencer?.id || selectedInfluencerId || dashboard.influencers[0]?.id || "";
    setSourceForBrief(post ?? null);
    setSourceTrend(null);
    setBriefForm({
      influencerId,
      assignmentId: "",
      title: post ? `Original concept inspired by ${post.creatorHandle || "reference post"}` : "",
      concept: post ? `Use the broad ${post.format} format as a structural reference. Create a new idea that fits the selected fictional creator; do not reuse the source image, caption, wording, or likeness.` : "",
      platform: post?.platform === "x" ? "x" : "instagram",
      format: post?.format === "video" ? "short_video" : post?.format === "text" ? "text_post" : "single_image",
      contentPillar: post?.influencer?.slug === "mira-byte" ? "Play Notes" : post?.influencer?.slug === "sana-vale" ? "Move Well" : ""
    });
    setSection("content");
  }

  function prepareTrendBrief(signal: TrendSignal) {
    const influencerId = signal.influencer?.id || selectedInfluencerId || dashboard.influencers[0]?.id || "";
    const creator = dashboard.influencers.find((item) => item.id === influencerId);
    setSourceForBrief(null);
    setSourceTrend(signal);
    setBriefForm({
      influencerId,
      assignmentId: "",
      title: `Original idea: ${signal.topic}`.slice(0, 180),
      concept: `Use the observed ${signal.topic} signal as editorial context, without implying it predicts audience response. Original concept: ${signal.proposedConcept}`,
      platform: "instagram",
      format: "single_image",
      contentPillar: creator?.slug === "mira-byte" ? "Play Notes" : creator?.slug === "sana-vale" ? "Move Well" : ""
    });
    setSection("content");
  }

  async function submitBrief(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api("/api/briefs", "POST", { ...briefForm, referencePostId: sourceForBrief?.id, trendSignalId: sourceTrend?.id });
      setMessage(`Draft created with ${briefForm.assignmentId}. The approved direction and evidence snapshot are retained for review.`);
      setSelectedBriefId(result.brief.id); setSelectedInfluencerId(briefForm.influencerId); setSelectedAssetId(""); setSelectedIdentityReferenceId(""); setGenerationSpendConfirmed(false); setSourceForBrief(null); setSourceTrend(null);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create brief"); }
    finally { setBusy(false); }
  }

  async function generateCandidate() {
    if (!selectedBrief) return;
    if (!selectedIdentityReferenceId || !approvedIdentityReferences.some((asset) => asset.id === selectedIdentityReferenceId)) {
      setError("Choose an approved face or body reference for this persona version before generation."); return;
    }
    if (!generationSpendConfirmed) { setError("Confirm the Fine Photo Gen credit spend before queuing candidates."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { job } = await api("/api/generation-jobs", "POST", { contentBriefId: selectedBrief.id, candidateCount: 2, aspectRatio: "3:4", identityReferenceAssetId: selectedIdentityReferenceId, spendAuthorized: true, idempotencyKey: crypto.randomUUID() });
      setGenerationSpendConfirmed(false);
      setMessage(`Generation job ${job.id.slice(0, 8)} queued. The worker records provider, model, seed, and candidate provenance.`);
      for (let attempt = 0; attempt < 45; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await api(`/api/generation-jobs/${job.id}`, "GET");
        if (["completed", "failed"].includes(result.job.status)) {
          if (result.job.status === "failed") setError(result.job.error || "Generation failed");
          else setMessage(result.job.assets.some((asset: Asset) => asset.isMock) ? "Mock candidate created for workflow verification. No image was generated." : "Candidate images are ready for review.");
          break;
        }
      }
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not start generation"); }
    finally { setBusy(false); }
  }

  async function approveBrief(decision: "approved" | "changes_requested") {
    if (!selectedBrief) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`/api/briefs/${selectedBrief.id}/approve`, "POST", { decision, assetId: decision === "approved" && selectedBrief.format !== "text_post" ? selectedAsset?.id : undefined });
      setMessage(decision === "approved" ? "Approved and recorded in the audit trail." : "Changes requested.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Approval failed"); }
    finally { setBusy(false); }
  }

  async function scheduleBrief(event: FormEvent) {
    event.preventDefault();
    if (!selectedBrief || !scheduleTime) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/schedule", "POST", { contentBriefId: selectedBrief.id, platform: selectedBrief.platform, scheduledFor: new Date(scheduleTime).toISOString(), assetId: selectedBrief.format !== "text_post" ? selectedAsset?.id : undefined });
      setMessage("Approved content added to the publishing calendar.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not schedule post"); }
    finally { setBusy(false); }
  }

  async function runDryRun(scheduledId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`/api/publish/${scheduledId}/run`, "POST", { dryRun: true });
      setMessage("Dry-run completed. No post was sent to a social platform."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Dry-run failed"); }
    finally { setBusy(false); }
  }

  async function publishLive(scheduledId: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`/api/publish/${scheduledId}/run`, "POST", { live: true });
      setMessage("Platform accepted the post. Its external post id is saved in the publishing log."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Live publishing failed"); await refresh().catch(() => undefined); }
    finally { setBusy(false); }
  }

  async function importMetrics(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const metrics = Object.fromEntries(Object.entries(metricForm).filter(([, value]) => value.trim() !== "").map(([key, value]) => [key, Number(value)]));
      await api("/api/metrics", "POST", { publishedPostId: metricPostId, observedAt: new Date(metricObservedAt).toISOString(), metrics });
      setMessage("Observed metrics imported with their capture time.");
      setMetricForm({ impressions: "", reach: "", views: "", likes: "", comments: "", shares: "", saves: "", profile_visits: "", followers_gained: "", link_clicks: "" });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not import metrics"); }
    finally { setBusy(false); }
  }

  async function togglePause() {
    setBusy(true); setError("");
    try {
      await api("/api/settings", "POST", { publishingPaused: !Boolean(dashboard.publishingPaused), publishingMode: dashboard.publishingMode });
      await refresh(); setMessage(Boolean(dashboard.publishingPaused) ? "Publishing pause cleared; mode remains human-controlled." : "Emergency publishing pause enabled.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update publishing setting"); }
    finally { setBusy(false); }
  }

  async function changePublishingMode(mode: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/settings", "POST", { publishingPaused: Boolean(dashboard.publishingPaused), publishingMode: mode });
      await refresh(); setMessage(`Publishing mode changed to ${mode.replaceAll("_", " ")}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update publishing mode"); }
    finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }

  if (loading) return <div className="app-loading"><div className="loader" /><span>Opening the studio…</span></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-icon">AI<span>·</span>IS</span><span className="brand-name">INFLUENCER<br />STUDIO</span></a>
      <div className="workspace-tag"><span className="workspace-dot" /> PRIVATE WORKSPACE</div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav">
        {navItems.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} onClick={() => setSection(item.id)}><span className="nav-code">{item.code}</span>{item.label}{item.id === "research" && dashboard.stats.researchCount > 0 && <span className="nav-count">{dashboard.stats.researchCount}</span>}</button>)}
      </nav>
      <div className="sidebar-label creators-label">CREATORS <span>{dashboard.influencers.length.toString().padStart(2, "0")}</span></div>
      <div className="creator-list">
        {dashboard.influencers.map((person, index) => <button className={`creator-item ${selectedInfluencerId === person.id ? "selected" : ""}`} key={person.id} onClick={() => { setSelectedInfluencerId(person.id); setSection("overview"); }}><span className={`creator-avatar avatar-${index}`}>{person.name.split(" ").map((name) => name[0]).join("")}</span><span><strong>{person.name}</strong><small>{person.suggestedHandle}</small></span><span className="creator-live" /></button>)}
      </div>
      <div className="sidebar-bottom"><div className="mini-status"><span className={dashboard.activation.finePhotoGenConfigured ? "status-dot" : "status-dot status-dot-muted"} /><span>Fine Photo Gen</span><small>{dashboard.activation.finePhotoGenConfigured ? "connected" : "setup needed"}</small></div><button className="logout-button" onClick={logout}>Sign out <span>↗</span></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">STUDIO <span>/</span> {navItems.find((item) => item.id === section)?.label.toUpperCase()}</div><div className="topbar-right"><span className="approval-chip"><i /> HUMAN REVIEW ON</span><button className="icon-button" onClick={() => refresh().catch((err) => setError(err.message))} title="Refresh">↻</button><span className="admin-chip">AD</span></div></header>
      <div className="content-wrap">
        {(message || error) && <div className={`notice ${error ? "notice-error" : "notice-success"}`}><span>{error || message}</span><button onClick={() => { setMessage(""); setError(""); }}>×</button></div>}
        {section === "overview" && <>
          <section className="page-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()} <span className="heading-divider">/</span> CREATOR OPERATIONS</div><h1>Good work starts with a signal.</h1><p>Build from observed evidence. Keep the characters distinct. Measure what happens after publishing.</p></div><div className="heading-actions"><button className="button button-quiet" onClick={() => setSection("research")}>Add research <span>＋</span></button><button className="button button-primary" onClick={() => prepareBrief()}>New content brief <span>↗</span></button></div></section>
          <section className="metric-grid">
            <MetricCard label="Reference posts" value={dashboard.stats.researchCount} note={dashboard.stats.researchCount ? "manual or authorized sources" : "add a verifiable source"} icon="◎" />
            <MetricCard label="Content briefs" value={dashboard.stats.briefCount} note="no briefs seeded without owner selection" icon="▤" />
            <MetricCard label="Pending review" value={dashboard.stats.pendingApprovals} note="human approval required" icon="◷" />
            <MetricCard label="Live posts measured" value={dashboard.stats.livePosts} note="dry-runs are excluded" icon="↗" />
          </section>
          <div className="overview-grid">
            <section className="panel creator-panel">
              <div className="panel-heading"><div><div className="eyebrow">PERSONA SNAPSHOT</div><h2>Creator profiles</h2></div><span className="small-link">VERSIONED DATA</span></div>
              <div className="profile-grid">{dashboard.influencers.map((person, index) => <button className={`profile-card profile-${index}`} key={person.id} onClick={() => { setSelectedInfluencerId(person.id); setSection("settings"); }}><div className="profile-card-top"><span className={`profile-avatar avatar-${index}`}>{person.name.split(" ").map((name) => name[0]).join("")}</span><span className="version-pill">v{person.personaVersions[0]?.version ?? 1}</span></div><strong>{person.name}</strong><span className="profile-handle">{person.suggestedHandle} · age {person.personaVersions[0]?.spec.age ?? "adult"}</span><p>{person.personaVersions[0]?.spec.positioning}</p><div className="pillar-row">{(person.personaVersions[0]?.spec.contentPillars ?? []).slice(0, 3).map((pillar) => <span key={pillar.name}>{pillar.name}</span>)}</div><div className="profile-footer"><span>AI-created fictional creator</span><span>→</span></div></button>)}</div>
            </section>
            <section className="panel health-panel"><div className="panel-heading"><div><div className="eyebrow">PIPELINE HEALTH</div><h2>Connections</h2></div><span className="health-indicator"><i /> {dashboard.activation.finePhotoGenConfigured ? "READY" : "2 NEED SETUP"}</span></div><ConnectionRow title="Fine Photo Gen" detail="Image generation provider" connected={dashboard.activation.finePhotoGenConfigured} /> <ConnectionRow title="Instagram Graph API" detail="Professional account publishing" connected={dashboard.activation.instagramConfigured} /> <ConnectionRow title="X API" detail="User-context publishing" connected={dashboard.activation.xConfigured} /><div className="health-footnote">Research records and performance data are never synthesized. Missing fields stay blank.</div></section>
          </div>
          <div className="overview-grid lower-grid">
            <section className="panel calendar-preview"><div className="panel-heading"><div><div className="eyebrow">NEXT 7 DAYS</div><h2>Planned content</h2></div><button className="text-button" onClick={() => setSection("calendar")}>Full calendar →</button></div><CalendarList briefs={filteredBriefs.slice(0, 6)} onSelect={(id) => { setSelectedBriefId(id); setSection("content"); }} /></section>
            <section className="panel signal-panel"><div className="panel-heading"><div><div className="eyebrow">RESEARCH SIGNAL</div><h2>Build the evidence base</h2></div><span className="signal-mark">◎</span></div><p>Start with specific public posts. Record what you observed and when; leave unavailable reach, views, or engagement blank.</p><div className="signal-steps"><span><b>01</b> Add a source URL</span><span><b>02</b> Record observed details</span><span><b>03</b> Review a locked creative assignment before briefing</span></div><button className="button button-quiet button-wide" onClick={() => setSection("directions")}>Review creative directions <span>↗</span></button></section>
          </div>
        </>}

        {section === "research" && <>
          <section className="page-heading"><div><div className="eyebrow">COMPETITIVE INTELLIGENCE / MANUAL + AUTHORIZED SOURCES</div><h1>Research with receipts.</h1><p>Store the source, evidence, and collection time. Analyze formats without copying a creator's identity or work.</p></div><div className="heading-counter"><strong>{references.length.toString().padStart(2, "0")}</strong><span>POST RECORDS</span></div></section>
          <div className="research-grid">
            <section className="panel form-panel"><div className="panel-heading"><div><div className="eyebrow">SOURCE SUBMISSION</div><h2>Add a reference post</h2></div><span className="form-step">01 / 02</span></div><form onSubmit={submitReference} className="form-stack">
              <div className="field-row"><Field label="Public post URL"><input type="url" required placeholder="https://…" value={referenceForm.url} onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })} /></Field><Field label="Platform"><select value={referenceForm.platform} onChange={(e) => setReferenceForm({ ...referenceForm, platform: e.target.value })}><option value="instagram">Instagram</option><option value="x">X</option><option value="youtube">YouTube</option><option value="reddit">Reddit</option><option value="other">Other</option></select></Field></div>
              <div className="field-row"><Field label="Creator handle"><input placeholder="@creator" value={referenceForm.creatorHandle} onChange={(e) => setReferenceForm({ ...referenceForm, creatorHandle: e.target.value })} /></Field><Field label="Format"><select value={referenceForm.format} onChange={(e) => setReferenceForm({ ...referenceForm, format: e.target.value })}><option value="photo">Photo</option><option value="carousel">Carousel</option><option value="short_video">Short video</option><option value="text">Text post</option><option value="story">Story</option></select></Field></div>
              <Field label="Associate with creator (optional)"><select value={referenceForm.influencerId} onChange={(e) => setReferenceForm({ ...referenceForm, influencerId: e.target.value })}><option value="">Shared research library</option>{dashboard.influencers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Your visual / content notes"><textarea rows={3} placeholder="Describe only what you observed: framing, setting, hook structure, or styling." value={referenceForm.description} onChange={(e) => setReferenceForm({ ...referenceForm, description: e.target.value })} /></Field>
              <Field label="Caption (optional)"><textarea rows={2} placeholder="Only if you are permitted to store this text." value={referenceForm.caption} onChange={(e) => setReferenceForm({ ...referenceForm, caption: e.target.value })} /></Field>
              <div className="field-row four-fields"><Field label="Likes"><input type="number" min="0" placeholder="—" value={referenceForm.likes} onChange={(e) => setReferenceForm({ ...referenceForm, likes: e.target.value })} /></Field><Field label="Comments"><input type="number" min="0" placeholder="—" value={referenceForm.comments} onChange={(e) => setReferenceForm({ ...referenceForm, comments: e.target.value })} /></Field><Field label="Views"><input type="number" min="0" placeholder="—" value={referenceForm.views} onChange={(e) => setReferenceForm({ ...referenceForm, views: e.target.value })} /></Field><Field label="Followers"><input type="number" min="0" placeholder="—" value={referenceForm.followerCount} onChange={(e) => setReferenceForm({ ...referenceForm, followerCount: e.target.value })} /></Field></div>
              <Field label="Metric provenance"><input placeholder="e.g. profile displayed count, captured 2026-10-31" value={referenceForm.evidenceNotes} onChange={(e) => setReferenceForm({ ...referenceForm, evidenceNotes: e.target.value })} /></Field>
              <div className="form-note"><span>ⓘ</span> All engagement fields are optional. Values are stored as manually observed; no unavailable metric is filled in.</div>
              <button className="button button-primary button-wide" disabled={busy}>{busy ? "Saving…" : "Save source record"}<span>↗</span></button>
            </form></section>
            <section className="panel research-list-panel"><div className="panel-heading"><div><div className="eyebrow">INSPIRATION LIBRARY</div><h2>Reference posts <span className="count-bubble">{filteredReferences.length}/{references.length}</span></h2></div><select aria-label="Filter research by creator" className="compact-select" value={researchCreator} onChange={(event) => setResearchCreator(event.target.value)}><option value="all">All creators</option><option value="shared">Shared research</option>{dashboard.influencers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
              <div className="research-filter-row"><input aria-label="Search research library" placeholder="Search source, creator, topic, notes…" value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} /><select aria-label="Filter research by platform" className="compact-select" value={researchPlatform} onChange={(event) => setResearchPlatform(event.target.value)}><option value="all">All platforms</option>{[...new Set([...references.map((post) => post.platform), ...referenceAccounts.map((account) => account.platform)])].sort().map((platform) => <option key={platform} value={platform}>{platform.toUpperCase()}</option>)}</select></div>
              {references.length === 0 ? <EmptyState title="No research records yet" text="Add source-linked observations here. New manual records stay proposals until included in an owner-approved creative assignment." action="The curated direction pack is reviewed separately." /> : filteredReferences.length === 0 ? <EmptyState title="No posts match these filters" text="Try a different term, creator, or platform." action="The complete source records remain in the library." /> : <div className="reference-list">{filteredReferences.map((post) => { const rate = observedFollowerInteractionRate(post); return <article className="reference-card" key={post.id}><div className="reference-card-top"><PlatformBadge platform={post.platform} /><span className="reference-format">{post.format.replaceAll("_", " ")}</span><span className="source-date">{formatDate(post.publishedAt)}</span></div><a className="reference-url" href={post.url} target="_blank" rel="noreferrer">{post.creatorHandle || post.url} <span>↗</span></a><p>{post.description || post.caption || "No description or caption supplied."}</p><div className="reference-metrics">{rate ? <span><b>{(rate.rate * 100).toFixed(2)}%</b> observed interaction / follower ratio{rate.partial ? ` · partial metrics (${rate.observedComponents}/4)` : ""}</span> : <span className="muted">Engagement rate unavailable</span>}<span>{post.views == null ? "Views unavailable" : `${post.views.toLocaleString()} observed views`}</span></div><div className="reference-footer"><span>Manual submission · proposal only · source metrics as supplied</span><button className="text-button" onClick={() => setSection("directions")}>Review locked directions →</button></div></article>; })}</div>}
            </section>
          </div>
          <div className="research-grid research-profile-grid">
            <section className="panel form-panel"><div className="panel-heading"><div><div className="eyebrow">COMPETITIVE SET</div><h2>Add a reference creator</h2></div><span className="form-step">PROFILE</span></div><form onSubmit={submitReferenceAccount} className="form-stack">
              <div className="field-row"><Field label="Public profile URL"><input type="url" required placeholder="https://…/creator" value={referenceAccountForm.profileUrl} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, profileUrl: event.target.value })} /></Field><Field label="Platform"><select value={referenceAccountForm.platform} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, platform: event.target.value })}><option value="instagram">Instagram</option><option value="x">X</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="reddit">Reddit</option><option value="twitch">Twitch</option></select></Field></div>
              <div className="field-row"><Field label="Username"><input value={referenceAccountForm.username} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, username: event.target.value })} placeholder="@creator" /></Field><Field label="Niche"><input required value={referenceAccountForm.niche} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, niche: event.target.value })} placeholder="Gaming, fitness, beauty…" /></Field></div>
              <Field label="Associate with studio creator"><select value={referenceAccountForm.influencerId} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, influencerId: event.target.value })}><option value="">Shared competitive set</option>{dashboard.influencers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Audience positioning"><textarea required minLength={5} rows={3} value={referenceAccountForm.audiencePositioning} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, audiencePositioning: event.target.value })} placeholder="Describe the audience and creator's niche based on observed public information." /></Field>
              <div className="field-row"><Field label="Audience demographics (if published)"><input value={referenceAccountForm.audienceDemographics} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, audienceDemographics: event.target.value })} placeholder="Leave blank when unknown" /></Field><Field label="Posting frequency (observed)"><input value={referenceAccountForm.postingFrequency} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, postingFrequency: event.target.value })} placeholder="e.g. 3 posts/week" /></Field></div>
              <Field label="Content types, comma separated"><input value={referenceAccountForm.contentTypes} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, contentTypes: event.target.value })} placeholder="setup photos, short video, reviews" /></Field>
              <Field label="Relevant hashtags, comma separated"><input value={referenceAccountForm.hashtags} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, hashtags: event.target.value })} placeholder="#cozygamer, #gymstyle" /></Field>
              <div className="field-row"><Field label="Observed followers"><input type="number" min="0" placeholder="—" value={referenceAccountForm.followerCount} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, followerCount: event.target.value })} /></Field><Field label="Count captured at"><input type="datetime-local" value={referenceAccountForm.followerCountObservedAt} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, followerCountObservedAt: event.target.value })} disabled={!referenceAccountForm.followerCount} /></Field></div>
              <Field label="Sample post URL (optional)"><input type="url" placeholder="An individual post that informs the comparison" value={referenceAccountForm.sampledPostUrl} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, sampledPostUrl: event.target.value })} /></Field>
              <div className="field-row four-fields"><Field label="Sample likes"><input type="number" min="0" placeholder="—" value={referenceAccountForm.sampleLikes} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, sampleLikes: event.target.value })} /></Field><Field label="Comments"><input type="number" min="0" placeholder="—" value={referenceAccountForm.sampleComments} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, sampleComments: event.target.value })} /></Field><Field label="Views"><input type="number" min="0" placeholder="—" value={referenceAccountForm.sampleViews} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, sampleViews: event.target.value })} /></Field><Field label="Captured at"><input type="datetime-local" value={referenceAccountForm.sampleObservedAt} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, sampleObservedAt: event.target.value })} /></Field></div>
              <Field label="Why this profile is relevant"><textarea required minLength={5} rows={3} value={referenceAccountForm.relevanceReason} onChange={(event) => setReferenceAccountForm({ ...referenceAccountForm, relevanceReason: event.target.value })} placeholder="What makes this account useful as a reference?" /></Field>
              <div className="form-note"><span>ⓘ</span> This records a profile URL and your observed notes only. The app does not scrape the profile or infer unavailable audience and performance data.</div>
              <button className="button button-primary button-wide" disabled={busy}>{busy ? "Saving…" : "Save reference profile"}<span>↗</span></button>
            </form></section>
            <section className="panel research-list-panel"><div className="panel-heading"><div><div className="eyebrow">DISCOVERED CREATORS</div><h2>Reference profiles <span className="count-bubble">{filteredReferenceAccounts.length}/{referenceAccounts.length}</span></h2></div><span className="small-link">SOURCE LINKED</span></div>
              {referenceAccounts.length === 0 ? <EmptyState title="No creator profiles yet" text="Add a profile from a permitted public or licensed source. Keep audience and follower data blank until observed." action="Profiles and individual posts are stored separately." /> : filteredReferenceAccounts.length === 0 ? <EmptyState title="No profiles match these filters" text="Try a different term, creator, or platform." action="The complete source records remain in the library." /> : <div className="reference-list">{filteredReferenceAccounts.map((account) => <article className="reference-card" key={account.id}><div className="reference-card-top"><PlatformBadge platform={account.platform} /><span className="reference-format">{account.niche}</span><span className="source-date">{formatDate(account.collectedAt)}</span></div><a className="reference-url" href={account.profileUrl} target="_blank" rel="noreferrer">{account.username || account.profileUrl} <span>↗</span></a><p>{account.audiencePositioning}</p>{account.audienceDemographics && <p className="muted-copy">Audience: {account.audienceDemographics}</p>}<div className="reference-metrics"><span>{account.followerCount == null ? "Follower count unavailable" : account.followerCount.toLocaleString() + " followers · captured " + formatDate(account.followerCountObservedAt)}</span><span>{account.postingFrequency || "Posting frequency unknown"}</span></div>{account.publicEngagement && (account.publicEngagement.sampledPostUrl || account.publicEngagement.likes != null || account.publicEngagement.comments != null || account.publicEngagement.views != null) && <div className="reference-metrics"><span>{account.publicEngagement.likes == null ? "Likes unavailable" : `${account.publicEngagement.likes.toLocaleString()} likes`} · {account.publicEngagement.comments == null ? "comments unavailable" : `${account.publicEngagement.comments.toLocaleString()} comments`} · {account.publicEngagement.views == null ? "views unavailable" : `${account.publicEngagement.views.toLocaleString()} views`}{account.publicEngagement.observedAt ? ` · captured ${formatDate(account.publicEngagement.observedAt)}` : ""}</span>{account.publicEngagement.sampledPostUrl && <a href={account.publicEngagement.sampledPostUrl} target="_blank" rel="noreferrer">Sample post ↗</a>}</div>}<div className="reference-footer"><span>{account.influencer?.name || "Shared research"} · manual submission · {account.contentTypes?.join(", ") || "No content types recorded"}</span><span>{account.source.provenance}</span></div></article>)}</div>}
            </section>
          </div>
          <div className="research-grid research-trend-grid">
            <section className="panel form-panel"><div className="panel-heading"><div><div className="eyebrow">TREND SIGNAL / HUMAN CURATION</div><h2>Log an observed opportunity</h2></div><span className="form-step">SOURCE → IDEA</span></div><form onSubmit={submitTrend} className="form-stack">
              <div className="field-row"><Field label="Topic or moment"><input required minLength={3} maxLength={160} value={trendForm.topic} onChange={(event) => setTrendForm({ ...trendForm, topic: event.target.value })} placeholder="A specific game release, format, or seasonal signal" /></Field><Field label="Source name"><input required minLength={2} value={trendForm.sourceName} onChange={(event) => setTrendForm({ ...trendForm, sourceName: event.target.value })} placeholder="Publication, API, or feed" /></Field></div>
              <Field label="Source URL"><input type="url" required value={trendForm.sourceUrl} onChange={(event) => setTrendForm({ ...trendForm, sourceUrl: event.target.value })} placeholder="https://…" /></Field>
              <div className="field-row"><Field label="Target creator"><select value={trendForm.influencerId} onChange={(event) => setTrendForm({ ...trendForm, influencerId: event.target.value })}><option value="">Shared / unassigned</option>{dashboard.influencers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Target audience (observed)" ><input value={trendForm.targetAudience} onChange={(event) => setTrendForm({ ...trendForm, targetAudience: event.target.value })} placeholder="Who this signal may matter to" /></Field></div>
              <div className="field-row"><Field label="Observed at"><input type="datetime-local" required value={trendForm.observedAt} onChange={(event) => setTrendForm({ ...trendForm, observedAt: event.target.value })} /></Field><Field label="Confidence · your estimate (0–100%)"><input type="number" required min="0" max="100" step="1" value={trendForm.confidence} onChange={(event) => setTrendForm({ ...trendForm, confidence: event.target.value })} placeholder="Leave blank until assessed" /></Field></div>
              <Field label="Evidence notes"><textarea required minLength={5} maxLength={1600} rows={3} value={trendForm.evidenceNote} onChange={(event) => setTrendForm({ ...trendForm, evidenceNote: event.target.value })} placeholder="What did the source actually show? Separate that from your interpretation." /></Field>
              <Field label="Why it may fit the creator"><textarea required minLength={5} maxLength={1200} rows={2} value={trendForm.relevance} onChange={(event) => setTrendForm({ ...trendForm, relevance: event.target.value })} placeholder="Audience relevance and identity fit" /></Field>
              <Field label="Original content proposal"><textarea required minLength={5} maxLength={1600} rows={3} value={trendForm.proposedConcept} onChange={(event) => setTrendForm({ ...trendForm, proposedConcept: event.target.value })} placeholder="An original angle that adds useful context" /></Field>
              <div className="field-row"><Field label="Estimated production effort"><select value={trendForm.estimatedProductionEffort} onChange={(event) => setTrendForm({ ...trendForm, estimatedProductionEffort: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field><Field label="Recommended publication window"><input type="datetime-local" value={trendForm.recommendedWindow} onChange={(event) => setTrendForm({ ...trendForm, recommendedWindow: event.target.value })} /></Field></div>
              <div className="field-row"><Field label="Signal expires at (optional)"><input type="datetime-local" value={trendForm.expiresAt} onChange={(event) => setTrendForm({ ...trendForm, expiresAt: event.target.value })} /></Field><span className="form-note trend-form-note">Confidence is a human estimate, not a platform metric. The app does not fetch or rank the source.</span></div>
              <button className="button button-primary button-wide" disabled={busy}>{busy ? "Saving…" : "Save sourced trend signal"}<span>↗</span></button>
            </form></section>
            <section className="panel research-list-panel"><div className="panel-heading"><div><div className="eyebrow">SOURCE → OPPORTUNITY</div><h2>Trend signals <span className="count-bubble">{trends.length}</span></h2></div><span className="small-link">OBSERVATION ≠ PREDICTION</span></div>
              {trends.length === 0 ? <EmptyState title="No trend signals logged" text="Save a public source, when you observed it, and a separate original content proposal." action="Automated connectors are not configured." /> : <div className="reference-list">{trends.map((signal) => { const expired = Boolean(signal.expiresAt && new Date(signal.expiresAt).getTime() < Date.now()); return <article className="reference-card" key={signal.id}><div className="reference-card-top"><span className={`status-pill ${expired ? "status-failed" : "status-approved"}`}>{expired ? "expired" : "active signal"}</span><span className="reference-format">{signal.estimatedProductionEffort || "effort unknown"} effort</span><span className="source-date">Observed {formatDate(signal.observedAt)}</span></div><h3 className="trend-topic">{signal.topic}</h3><a className="reference-url" href={signal.sourceUrl} target="_blank" rel="noreferrer">{signal.sourceName} ↗</a><p>{signal.evidence?.note || "No evidence note supplied."}</p><div className="reference-metrics"><span>{signal.influencer?.name || "Shared / unassigned"} · human confidence {(signal.confidence * 100).toFixed(0)}%</span><span>{signal.targetAudience || "Audience not specified"}</span></div><div className="trend-proposal"><small>ORIGINAL PROPOSAL</small><p>{signal.proposedConcept}</p></div><div className="reference-footer"><span>{signal.relevance}{signal.expiresAt ? ` · expires ${formatDate(signal.expiresAt)}` : " · evergreen expiry not set"}</span><button className="text-button" onClick={() => setSection("directions")}>Creative assignment review →</button></div></article>; })}</div>}
            </section>
          </div>
        </>}

        {section === "directions" && <CreativeDirectionReview creators={dashboard.influencers} onChanged={refresh} />}

        {section === "content" && <>
          <section className="page-heading"><div><div className="eyebrow">CREATIVE PRODUCTION / HUMAN REVIEW</div><h1>Make the idea yours.</h1><p>Turn a source structure or an evergreen concept into a character-specific brief, then generate and review candidates.</p></div><button className="button button-quiet" onClick={() => prepareBrief()}>New brief <span>＋</span></button></section>
          <div className="content-studio-grid">
            <section className="panel brief-form-panel"><div className="panel-heading"><div><div className="eyebrow">CREATIVE BRIEF</div><h2>{sourceForBrief || sourceTrend ? "Research to original" : "New concept"}</h2></div>{(sourceForBrief || sourceTrend) && <span className="source-linked">SOURCE LINKED</span>}</div>
              <form className="form-stack" onSubmit={submitBrief}>
                <Field label="Creator"><select value={briefForm.influencerId} onChange={(e) => setBriefForm({ ...briefForm, influencerId: e.target.value, assignmentId: "" })}>{dashboard.influencers.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></Field>
                <Field label="Owner-approved direction"><select required value={briefForm.assignmentId} onChange={(e) => setBriefForm({ ...briefForm, assignmentId: e.target.value })}><option value="">Choose an approved assignment</option>{approvedAssignmentsForBrief.map((assignment) => <option value={assignment.id} key={assignment.id}>{assignment.id} · {assignment.direction}</option>)}</select></Field>
                {briefForm.assignmentId && <div className="form-note">Locked direction: {approvedAssignmentsForBrief.find((item) => item.id === briefForm.assignmentId)?.direction} <button type="button" className="text-button" onClick={() => setSection("directions")}>Inspect sources →</button></div>}
                {approvedAssignmentsForBrief.length === 0 && <div className="form-note">No approved direction for this creator yet. Review a specific assignment in <button type="button" className="text-button" onClick={() => setSection("directions")}>Direction review</button> first.</div>}
                <Field label="Working title"><input required value={briefForm.title} onChange={(e) => setBriefForm({ ...briefForm, title: e.target.value })} placeholder="A specific, memorable post idea" /></Field>
                <Field label="Original concept"><textarea required rows={4} minLength={10} value={briefForm.concept} onChange={(e) => setBriefForm({ ...briefForm, concept: e.target.value })} placeholder="What would make this useful or entertaining for the audience?" /></Field>
                <div className="field-row"><Field label="Platform"><select value={briefForm.platform} onChange={(e) => setBriefForm({ ...briefForm, platform: e.target.value })}><option value="instagram">Instagram</option><option value="x">X</option></select></Field><Field label="Format"><select value={briefForm.format} onChange={(e) => setBriefForm({ ...briefForm, format: e.target.value })}><option value="single_image">Single image</option><option value="carousel">Carousel</option><option value="short_video">Short video</option><option value="text_post">Text post</option></select></Field></div>
                <Field label="Content pillar"><input required value={briefForm.contentPillar} onChange={(e) => setBriefForm({ ...briefForm, contentPillar: e.target.value })} placeholder="e.g. Setup Lab or Beauty Notes" /></Field>
                {sourceForBrief && <div className="linked-source"><span className="link-icon">↗</span><span><strong>Reference provenance attached</strong><small>{sourceForBrief.creatorHandle || sourceForBrief.url}</small></span><button type="button" onClick={() => setSourceForBrief(null)}>Remove</button></div>}
                {sourceTrend && <div className="linked-source"><span className="link-icon">↗</span><span><strong>Trend evidence attached</strong><small>{sourceTrend.topic} · {sourceTrend.sourceName}</small></span><button type="button" onClick={() => setSourceTrend(null)}>Remove</button></div>}
                <div className="form-note"><span>✳</span> The brief builder locks persona details and explicitly excludes source image, caption, and likeness copying.</div>
                <button className="button button-primary button-wide" disabled={busy}>{busy ? "Creating…" : "Create brief"}<span>↗</span></button>
              </form>
            </section>
            <section className="panel brief-list-panel"><div className="panel-heading"><div><div className="eyebrow">PRODUCTION QUEUE</div><h2>Content briefs <span className="count-bubble">{filteredBriefs.length}</span></h2></div><select className="compact-select" value={selectedInfluencerId} onChange={(e) => setSelectedInfluencerId(e.target.value)}>{dashboard.influencers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
              <div className="brief-list">{filteredBriefs.map((item) => <button className={`brief-row ${selectedBrief?.id === item.id ? "active" : ""}`} key={item.id} onClick={() => { setSelectedBriefId(item.id); setSelectedAssetId(""); setSelectedIdentityReferenceId(""); setGenerationSpendConfirmed(false); }}><span className="brief-date">{formatDate(item.scheduledFor, { month: "short", day: "2-digit" })}</span><span className="brief-main"><strong>{item.title}</strong><small>{item.contentPillar} · {item.platform.toUpperCase()} · {item.format.replaceAll("_", " ")}</small></span><StatusPill status={item.status} /><span className="brief-arrow">›</span></button>)}</div>
            </section>
            {selectedBrief && <section className="panel production-detail"><div className="detail-heading"><div><div className="eyebrow">SELECTED BRIEF / {selectedBrief.platform.toUpperCase()}</div><h2>{selectedBrief.title}</h2></div><StatusPill status={selectedBrief.status} /></div><div className="detail-copy"><p>{selectedBrief.concept}</p><label>OWNER-SELECTED DIRECTION</label><div className="caption-box">{selectedBrief.assignmentId ? `${selectedBrief.assignmentId} · ${selectedBrief.intendedShot || selectedBrief.creativeAssignment?.direction || "Locked direction"}` : "Legacy brief without a reviewed assignment. Approval, generation, scheduling, and publishing are disabled."}</div><label>CAPTION DRAFT</label><div className="caption-box">{selectedBrief.captionDraft}</div><label>IMAGE GENERATION DIRECTION</label><div className="prompt-box">{selectedBrief.imagePrompt}</div></div>
              <div className="candidate-heading"><div><div className="eyebrow">MEDIA CANDIDATES</div><strong>{selectedBrief.assets.length} saved</strong></div></div>
              {selectedBrief.format !== "text_post" && <div className="generation-authorization"><Field label="Approved identity reference · same persona version"><select value={selectedIdentityReferenceId} onChange={(event) => setSelectedIdentityReferenceId(event.target.value)}><option value="">Choose a reviewed face or body image</option>{approvedIdentityReferences.map((asset) => <option key={asset.id} value={asset.id}>{asset.kind} · SHA {asset.sha256.slice(0, 8)}</option>)}</select></Field><label className="rights-confirm"><input type="checkbox" checked={generationSpendConfirmed} onChange={(event) => setGenerationSpendConfirmed(event.target.checked)} /><span>I explicitly authorize this candidate request to use Fine Photo Gen credits. The provider may charge the connected account.</span></label><button className="button button-quiet" onClick={generateCandidate} disabled={busy || !selectedBrief.assignmentId || !selectedIdentityReference || !generationSpendConfirmed || (!dashboard.activation.finePhotoGenConfigured && dashboard.activation.mediaProvider !== "mock")}>{busy ? "Working…" : "Authorize & generate 2 candidates"}<span>✳</span></button>{!selectedBrief.assignmentId && <small>This brief has no approved assignment and cannot generate. Create a new brief after direction review.</small>}{approvedIdentityReferences.length === 0 && <small>Upload and approve face and body references for this creator's current persona version in Direction review.</small>}</div>}
              {!dashboard.activation.finePhotoGenConfigured && dashboard.activation.mediaProvider !== "mock" && <div className="provider-alert"><strong>Fine Photo Gen connection needed</strong><span>Set the server URL and session cookie before generation can be queued.</span><button onClick={() => setSection("settings")}>View setup →</button></div>}
              <div className="candidate-grid">{selectedBrief.assets.length === 0 ? <div className="candidate-empty"><span>▧</span><strong>No candidates yet</strong><small>Generation provenance and review state appear here after a provider run.</small></div> : selectedBrief.assets.map((asset) => <button key={asset.id} className={`candidate-card ${selectedAsset?.id === asset.id ? "selected" : ""}`} onClick={() => setSelectedAssetId(asset.id)}>{asset.isMock ? <div className="mock-art"><span>MOCK</span><small>No image generated</small></div> : <img src={asset.outputUrl} alt="Generated candidate" />}<div className="candidate-meta"><span>{asset.provider} · {asset.model || "model unknown"}</span><small>Seed {asset.seed ?? "unknown"} · {asset.reviewStatus}</small></div></button>)}</div>
              <div className="detail-actions"><button className="button button-quiet" onClick={() => approveBrief("changes_requested")} disabled={busy || !selectedBrief.assignmentId}>Request changes</button><button className="button button-primary" onClick={() => approveBrief("approved")} disabled={busy || !selectedBrief.assignmentId || (!selectedAsset && selectedBrief.format !== "text_post") }>Approve selected</button></div>
              {selectedBrief.status === "approved" && <form className="schedule-form" onSubmit={scheduleBrief}><Field label="Schedule date and time"><input type="datetime-local" required value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></Field><button className="button button-primary" disabled={busy}>Add to calendar <span>→</span></button></form>}
              {selectedBrief.scheduledPosts?.filter((item) => item.status === "scheduled").map((item) => <div className="scheduled-actions" key={item.id}><span>Scheduled for {formatDate(item.scheduledFor, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><a className="text-button" href={`/api/publish/${item.id}/export`} target="_blank">Export post JSON ↗</a><button className="button button-quiet" onClick={() => runDryRun(item.id)} disabled={busy}>Run explicit dry-run</button>{dashboard.livePublishingEnabled && <button className="button button-primary" onClick={() => publishLive(item.id)} disabled={busy || dashboard.publishingPaused}>Publish live</button>}</div>)}
            </section>}
          </div>
        </>}

        {section === "calendar" && <><section className="page-heading"><div><div className="eyebrow">ROLLING EDITORIAL PLAN / NOVEMBER 2026</div><h1>Plan with room to learn.</h1><p>Annual themes are seeded; production briefs appear only after you approve an assignment and create a draft. Reprioritize monthly as observed performance comes in.</p></div><div className="heading-actions"><button className="button button-quiet" onClick={() => setSection("analytics")}>Review evidence <span>↗</span></button></div></section><AnnualRoadmap plan={selectedInfluencer?.strategies?.[0]?.plan} name={selectedInfluencer?.name ?? "Creator"} /><section className="panel calendar-panel"><div className="panel-heading"><div><div className="eyebrow">OWNER-APPROVED PRODUCTION CALENDAR</div><h2>{selectedInfluencer?.name ?? "All creators"}</h2></div><select className="compact-select" value={selectedInfluencerId} onChange={(e) => setSelectedInfluencerId(e.target.value)}>{dashboard.influencers.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></div><CalendarList briefs={filteredBriefs} onSelect={(id) => { setSelectedBriefId(id); setSection("content"); }} /></section></>}

        {section === "analytics" && <><section className="page-heading"><div><div className="eyebrow">MEASURED PERFORMANCE / OBSERVED DATA ONLY</div><h1>Learn from what happened.</h1><p>Dry-runs never appear as published performance. Recommendations wait for actual platform metrics.</p></div><span className="evidence-chip">NO SYNTHETIC METRICS</span></section>
          {analytics.livePublishedPosts === 0 ? <section className="panel analytics-panel"><div className="analytics-empty"><div className="empty-chart"><span /><span /><span /><span /><span /><span /><span /></div><div className="eyebrow">BASELINE NOT ESTABLISHED</div><h2>There are no live post metrics yet.</h2><p>The studio will compare pillar, format, hook, platform, and production cost when published posts and observed metrics are connected. Missing metrics stay missing.</p><div className="analytics-checks"><span><i /> Exposure-adjusted comparisons require reach or impressions</span><span><i /> Cause and effect will be labeled as uncertain</span><span><i /> Recommendations will link back to source observations</span></div></div></section> : <div className="analytics-grid"><section className="panel analytics-panel"><div className="panel-heading"><div><div className="eyebrow">OBSERVED PERFORMANCE</div><h2>{analytics.livePublishedPosts} live posts · {analytics.observedMetricRows} metric records</h2></div><span className="small-link">LAST 7 DAYS: {analytics.metricObservationsLast7Days}</span></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Post</th><th>Creator / platform</th><th>Observed reach</th><th>Engagement rate</th><th>Captured metrics</th></tr></thead><tbody>{analytics.observations.map((row) => <tr key={row.id}><td><strong>{row.title}</strong><small>{row.pillar} · {formatDate(row.publishedAt)}</small></td><td>{row.influencer}<small>{row.platform.toUpperCase()}</small></td><td>{row.metrics.impressions ?? row.metrics.reach ?? "Unavailable"}</td><td>{row.engagementRate == null ? "Not comparable" : `${(row.engagementRate * 100).toFixed(2)}%`}</td><td>{Object.keys(row.metrics).length}</td></tr>)}</tbody></table></div>{analytics.byPillar.length > 0 && <div className="pillar-evidence"><h3>Observed by content pillar</h3>{analytics.byPillar.map((row) => <div key={row.pillar}><strong>{row.pillar}</strong><span>{row.comparablePosts} exposure-qualified / {row.posts} posts</span><small>{row.averageObservedEngagementRate == null ? "No comparable rate" : `${(row.averageObservedEngagementRate * 100).toFixed(2)}% mean observed rate`} · {row.interpretation}</small></div>)}</div>}</section><section className="panel metric-import-panel"><div className="eyebrow">MANUAL METRIC INGESTION</div><h2>Record platform observations</h2><p>Only import values visible in the platform or provided by an authorized API. Missing fields stay blank.</p><form className="form-stack" onSubmit={importMetrics}><Field label="Live published post"><select required value={metricPostId} onChange={(e) => setMetricPostId(e.target.value)}><option value="">Select a post</option>{analytics.publishedPostsAvailableForImport.map((post) => <option key={post.id} value={post.id}>{post.influencer} · {post.title} · {post.platform}</option>)}</select></Field><Field label="Observed at"><input type="datetime-local" value={metricObservedAt} onChange={(e) => setMetricObservedAt(e.target.value)} required /></Field><div className="metric-input-grid">{Object.entries(metricForm).map(([key, value]) => <Field key={key} label={key.replaceAll("_", " ")}><input type="number" min="0" placeholder="—" value={value} onChange={(e) => setMetricForm({ ...metricForm, [key]: e.target.value })} /></Field>)}</div><button className="button button-primary button-wide" disabled={busy}>Save observed metrics</button></form></section></div>}
        </>}

        {section === "settings" && <><section className="page-heading"><div><div className="eyebrow">SYSTEM ADMINISTRATION / ACTIVATION</div><h1>Keep the controls visible.</h1><p>Social credentials are encrypted at rest. Use access tokens issued for each intended platform account.</p></div></section><div className="settings-grid"><section className="panel settings-card social-accounts-card"><div className="panel-heading"><div><div className="eyebrow">SOCIAL ACCOUNT CONNECTIONS</div><h2>Connect each creator</h2></div><span className="human-mode">TOKENS ENCRYPTED</span></div><p className="setting-copy">Instagram requires a Professional account and app publishing permission. X needs a user-context OAuth 2.0 token with post-write permission. Saved tokens are never returned to this page.</p>{dashboard.influencers.map((person) => <div className="social-creator-config" key={person.id}><h3>{person.name}</h3>{(["instagram", "x"] as const).map((platform) => { const existing = person.socialAccounts.find((account) => account.platform === platform); return <SocialAccountForm key={`${person.id}-${platform}`} influencerId={person.id} influencerName={person.name} platform={platform} existing={existing} onSaved={refresh} onError={setError} onMessage={setMessage} />; })}</div>)}</section><section className="panel settings-card"><div className="panel-heading"><div><div className="eyebrow">AUTOMATION SAFETY</div><h2>Publishing controls</h2></div><span className="human-mode">HUMAN APPROVAL</span></div><div className="pause-setting"><div><strong>Emergency pause</strong><p>Stop scheduled publishing for every account.</p></div><button className={`toggle ${dashboard.publishingPaused ? "on" : ""}`} onClick={togglePause} aria-label="Toggle emergency publishing pause"><span /></button></div><label className="setting-row"><span>Operation mode</span><select value={dashboard.publishingMode} disabled={busy} onChange={(event) => changePublishingMode(event.target.value)}><option value="draft">Draft only</option><option value="human_approval">Human approval (default)</option><option value="dry_run">Dry-run only</option><option value="automatic_preapproved">Automatic after approval</option><option value="conditional_autopublish">Conditional · X text only</option></select></label><div className="setting-row"><span>Instagram account</span><StatusPill status={dashboard.activation.instagramConfigured ? "connected" : "not_connected"} /></div><div className="setting-row"><span>X account</span><StatusPill status={dashboard.activation.xConfigured ? "connected" : "not_connected"} /></div><div className="settings-footnote">Live publishing is {dashboard.livePublishingEnabled ? "enabled by the server" : "disabled by the server"}. Approved content can be exported or run through an explicit dry-run.</div></section><section className="panel settings-card"><div className="panel-heading"><div><div className="eyebrow">IMAGE GENERATION</div><h2>Fine Photo Gen</h2></div><StatusPill status={dashboard.activation.finePhotoGenConfigured ? "connected" : "setup_needed"} /></div><p className="setting-copy">The adapter targets the real Fine Photo Gen <code>/api/generate</code> and <code>/api/edit</code> routes discovered in the connected repository.</p><div className="setting-row"><span>Provider mode</span><strong>{dashboard.activation.mediaProvider}</strong></div><div className="setting-row"><span>Character LoRAs</span><strong>Optional · one per persona</strong></div><div className="settings-footnote">Existing routes use a signed-in Fine Photo Gen session and spend credits on that account. A scoped service token endpoint is needed for robust unattended production.</div><button className="text-button settings-doc-link" onClick={() => window.open("/docs", "_blank")}>Read integration requirements →</button></section><section className="panel settings-card"><div className="panel-heading"><div><div className="eyebrow">IDENTITY PACKS</div><h2>Visual references</h2></div><span className="small-link">VERSIONED</span></div>{dashboard.influencers.map((person) => <div className="identity-row" key={person.id}><span className={`creator-avatar avatar-${dashboard.influencers.indexOf(person)}`}>{person.name.split(" ").map((name) => name[0]).join("")}</span><span><strong>{person.name}</strong><small>v{person.personaVersions[0]?.version} · {person.personaVersions[0]?.spec.visualIdentity?.referenceAssetStatus?.replaceAll("_", " ")}</small></span><button onClick={() => { setSelectedInfluencerId(person.id); setSection("directions"); }}>Review references</button></div>)}<div className="settings-footnote">The identity references are not generated yet. Upload and review original face and body references in Direction review before generation can be queued.</div></section><section className="panel settings-card"><div className="panel-heading"><div><div className="eyebrow">DATA INTEGRITY</div><h2>Current blockers</h2></div><span className="status-dot status-dot-muted" /></div><ul className="blocker-list"><li>Fine Photo Gen has no documented service-to-service auth endpoint.</li><li>{dashboard.activation.instagramConfigured || dashboard.activation.xConfigured ? "One or more platform accounts are configured; verify live permissions before publishing." : "Meta and X access tokens are not configured."}</li><li>Research library is empty until reference URLs are submitted.</li><li>Character canon needs owner-approved face and body uploads for each persona version.</li></ul><div className="settings-footnote">Automatic publishing still requires approved content. Conditional mode is restricted to text-only X posts; the worker respects due times, account credentials, and the emergency pause.</div></section></div></>}
      </div>
      <footer className="app-footer"><span>AI INFLUENCER STUDIO <b>·</b> PRIVATE BUILD</span><span>Versioned personas <b>·</b> Observable workflows <b>·</b> Human approval</span></footer>
    </main>
  </div>;
}

function SocialAccountForm({ influencerId, influencerName, platform, existing, onSaved, onError, onMessage }: { influencerId: string; influencerName: string; platform: "instagram" | "x"; existing?: SocialAccount; onSaved: () => Promise<void>; onError: (value: string) => void; onMessage: (value: string) => void }) {
  const [accountId, setAccountId] = useState(existing?.externalAccountId ?? "");
  const [handle, setHandle] = useState(existing?.handle ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [graphVersion, setGraphVersion] = useState(existing?.settings?.graphVersion ?? "");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); onError(""); onMessage("");
    try {
      const response = await fetch(`/api/accounts/${influencerId}/${platform}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId, handle: handle || undefined, accessToken, graphVersion: platform === "instagram" ? graphVersion || undefined : undefined })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Account setup failed (${response.status})`);
      setAccessToken(""); onMessage(`${influencerName} ${platform === "instagram" ? "Instagram" : "X"} credentials saved encrypted.`);
      await onSaved();
    } catch (error) { onError(error instanceof Error ? error.message : "Could not save social credentials"); }
    finally { setSaving(false); }
  }

  return <form className="social-account-form" onSubmit={save}>
    <div className="social-account-heading"><strong>{platform === "instagram" ? "Instagram" : "X"}</strong><span>{existing?.tokenConfigured ? "CREDENTIAL STORED" : "NOT CONFIGURED"}</span></div>
    <div className="social-account-fields">
      <Field label={platform === "instagram" ? "Professional account ID" : "X user ID"}><input value={accountId} onChange={(event) => setAccountId(event.target.value)} required maxLength={128} placeholder={platform === "instagram" ? "Meta Instagram user ID" : "Account ID from X OAuth"} /></Field>
      <Field label="Public handle"><input value={handle} onChange={(event) => setHandle(event.target.value)} maxLength={64} placeholder="@handle" /></Field>
      {platform === "instagram" && <Field label="Meta Graph API version"><input value={graphVersion} onChange={(event) => setGraphVersion(event.target.value)} placeholder="e.g. v24.0" pattern="v[0-9]+\\.[0-9]+" required /></Field>}
      <Field label={existing?.tokenConfigured ? "Replace access token" : "User access token"}><input type="password" autoComplete="new-password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} minLength={20} maxLength={8000} required placeholder="Token is write-only" /></Field>
    </div>
    <button className="button button-quiet" disabled={saving || !accessToken}>{saving ? "Saving…" : "Save encrypted credentials"}</button>
  </form>;
}

function MetricCard({ label, value, note, icon }: { label: string; value: number; note: string; icon: string }) {
  return <article className="metric-card"><div className="metric-card-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value.toString().padStart(2, "0")}</strong><small>{note}</small></article>;
}

function ConnectionRow({ title, detail, connected }: { title: string; detail: string; connected: boolean }) {
  return <div className="connection-row"><span className={`connection-icon ${connected ? "ok" : ""}`}>{connected ? "✓" : "·"}</span><span><strong>{title}</strong><small>{detail}</small></span><span className={`connection-state ${connected ? "connected" : ""}`}>{connected ? "Connected" : "Not configured"}</span></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }

function PlatformBadge({ platform }: { platform: string }) { return <span className={`platform-badge platform-${platform}`}>{platform === "instagram" ? "IG" : platform === "x" ? "X" : platform.slice(0, 2).toUpperCase()}</span>; }

function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return <span className={`status-pill status-${status}`}>{label}</span>;
}

function CalendarList({ briefs, onSelect }: { briefs: Brief[]; onSelect: (id: string) => void }) {
  if (!briefs.length) return <div className="calendar-empty">No planned posts for this creator.</div>;
  return <div className="calendar-list">{briefs.map((item) => <button className="calendar-row" onClick={() => onSelect(item.id)} key={item.id}><span className="calendar-date"><strong>{formatDate(item.scheduledFor, { day: "2-digit" })}</strong><small>{formatDate(item.scheduledFor, { month: "short" })}</small></span><span className="calendar-rail" /><span className="calendar-copy"><strong>{item.title}</strong><small>{item.influencer.name} · {item.contentPillar}</small></span><PlatformBadge platform={item.platform} /><StatusPill status={item.status} /></button>)}</div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action: string }) {
  return <div className="empty-state"><span className="empty-state-icon">◎</span><h3>{title}</h3><p>{text}</p><small>{action}</small></div>;
}

function AnnualRoadmap({ plan, name }: { plan?: AnnualPlan; name: string }) {
  return <section className="annual-roadmap">
    <div className="roadmap-heading">
      <div><div className="eyebrow">ANNUAL STRATEGY · VERSIONED</div><h2>{name} <span>{plan?.periodStart} — {plan?.periodEnd}</span></h2></div>
      <small>Rolling review · weekly evidence · monthly replan · quarterly strategy</small>
    </div>
    <div className="roadmap-grid">{(plan?.months ?? []).map((month) => {
      const monthDate = new Date(`${month.month}-01T00:00:00Z`);
      const label = new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(monthDate).toUpperCase();
      return <article key={month.month} className="roadmap-month"><span>{label}</span><strong>{month.themes[0]}</strong><p>{month.themes[1]}</p><small>EXPERIMENT</small><em>{month.experiment}</em></article>;
    })}</div>
  </section>;
}
