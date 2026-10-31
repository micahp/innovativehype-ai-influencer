-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Influencer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "suggestedHandle" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaVersion" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "spec" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT,
    "externalAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "tokenCiphertext" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "platform" TEXT,
    "url" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "submittedBy" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferencePost" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT,
    "sourceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "creatorHandle" TEXT,
    "originalPostId" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "format" TEXT NOT NULL,
    "caption" TEXT,
    "hashtags" JSONB,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "views" INTEGER,
    "impressions" INTEGER,
    "followerCount" INTEGER,
    "metricsObservedAt" TIMESTAMP(3),
    "description" TEXT,
    "visualAnalysis" JSONB,
    "tags" JSONB,
    "evidenceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferencePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceInfluencer" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT,
    "sourceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT,
    "profileUrl" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "audiencePositioning" TEXT NOT NULL,
    "audienceDemographics" TEXT,
    "followerCount" INTEGER,
    "followerCountObservedAt" TIMESTAMP(3),
    "contentTypes" JSONB,
    "postingFrequency" TEXT,
    "hashtags" JSONB,
    "publicEngagement" JSONB,
    "relevanceReason" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceInfluencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendSignal" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT,
    "topic" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "targetAudience" TEXT,
    "relevance" TEXT NOT NULL,
    "proposedConcept" TEXT NOT NULL,
    "estimatedProductionEffort" TEXT,
    "recommendedWindow" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualStrategy" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnualStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "personaVersionId" TEXT,
    "referencePostId" TEXT,
    "trendSignalId" TEXT,
    "title" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "contentPillar" TEXT NOT NULL,
    "captionDraft" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "contentBriefId" TEXT NOT NULL,
    "generationJobId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'image',
    "outputUrl" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "seed" BIGINT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "costUsd" DECIMAL(10,4),
    "metadata" JSONB,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "contentBriefId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "idempotencyKey" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "result" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL,
    "contentBriefId" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "decision" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "contentBriefId" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "platform" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedPost" (
    "id" TEXT NOT NULL,
    "scheduledPostId" TEXT NOT NULL,
    "externalPostId" TEXT,
    "postUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "publicationStatus" TEXT NOT NULL DEFAULT 'published',
    "result" JSONB,

    CONSTRAINT "PublishedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMetric" (
    "id" TEXT NOT NULL,
    "publishedPostId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "outcome" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT,
    "agent" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputs" JSONB,
    "outputs" JSONB,
    "error" TEXT,
    "costUsd" DECIMAL(10,4),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCost" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT,
    "generationJobId" TEXT,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountUsd" DECIMAL(10,4) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ProviderCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_slug_key" ON "Influencer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaVersion_influencerId_version_key" ON "PersonaVersion"("influencerId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_influencerId_platform_key" ON "SocialAccount"("influencerId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ReferencePost_url_key" ON "ReferencePost"("url");

-- CreateIndex
CREATE INDEX "ReferencePost_platform_publishedAt_idx" ON "ReferencePost"("platform", "publishedAt");

-- CreateIndex
CREATE INDEX "ReferencePost_influencerId_format_idx" ON "ReferencePost"("influencerId", "format");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceInfluencer_sourceId_key" ON "ReferenceInfluencer"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceInfluencer_profileUrl_key" ON "ReferenceInfluencer"("profileUrl");

-- CreateIndex
CREATE INDEX "ReferenceInfluencer_platform_niche_idx" ON "ReferenceInfluencer"("platform", "niche");

-- CreateIndex
CREATE INDEX "ReferenceInfluencer_influencerId_collectedAt_idx" ON "ReferenceInfluencer"("influencerId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualStrategy_influencerId_year_version_key" ON "AnnualStrategy"("influencerId", "year", "version");

-- CreateIndex
CREATE INDEX "ContentBrief_influencerId_scheduledFor_idx" ON "ContentBrief"("influencerId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ContentBrief_status_scheduledFor_idx" ON "ContentBrief"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key" ON "GenerationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationJob_status_createdAt_idx" ON "GenerationJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPost_idempotencyKey_key" ON "ScheduledPost"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_scheduledFor_idx" ON "ScheduledPost"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedPost_scheduledPostId_key" ON "PublishedPost"("scheduledPostId");

-- CreateIndex
CREATE INDEX "PostMetric_metric_observedAt_idx" ON "PostMetric"("metric", "observedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "PersonaVersion" ADD CONSTRAINT "PersonaVersion_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePost" ADD CONSTRAINT "ReferencePost_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferencePost" ADD CONSTRAINT "ReferencePost_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceInfluencer" ADD CONSTRAINT "ReferenceInfluencer_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceInfluencer" ADD CONSTRAINT "ReferenceInfluencer_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendSignal" ADD CONSTRAINT "TrendSignal_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualStrategy" ADD CONSTRAINT "AnnualStrategy_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_referencePostId_fkey" FOREIGN KEY ("referencePostId") REFERENCES "ReferencePost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_trendSignalId_fkey" FOREIGN KEY ("trendSignalId") REFERENCES "TrendSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedPost" ADD CONSTRAINT "PublishedPost_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "ScheduledPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMetric" ADD CONSTRAINT "PostMetric_publishedPostId_fkey" FOREIGN KEY ("publishedPostId") REFERENCES "PublishedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCost" ADD CONSTRAINT "ProviderCost_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCost" ADD CONSTRAINT "ProviderCost_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
