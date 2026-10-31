-- CreateTable
CREATE TABLE "CreativeAssignment" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "boardPath" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "creatorIds" JSONB NOT NULL,
    "postIds" JSONB NOT NULL,
    "photoSourceIds" JSONB NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_owner_review',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreativeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityReferenceAsset" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "personaVersionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "rightsBasis" TEXT NOT NULL,
    "rightsNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdentityReferenceAsset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ContentBrief" ADD COLUMN "assignmentId" TEXT,
ADD COLUMN "intendedShot" TEXT,
ADD COLUMN "sourceSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "CreativeAssignment_influencerId_status_idx" ON "CreativeAssignment"("influencerId", "status");
CREATE UNIQUE INDEX "IdentityReferenceAsset_storageKey_key" ON "IdentityReferenceAsset"("storageKey");
CREATE INDEX "IdentityReferenceAsset_influencerId_personaVersionId_kind_status_idx" ON "IdentityReferenceAsset"("influencerId", "personaVersionId", "kind", "status");

-- AddForeignKey
ALTER TABLE "CreativeAssignment" ADD CONSTRAINT "CreativeAssignment_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityReferenceAsset" ADD CONSTRAINT "IdentityReferenceAsset_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdentityReferenceAsset" ADD CONSTRAINT "IdentityReferenceAsset_personaVersionId_fkey" FOREIGN KEY ("personaVersionId") REFERENCES "PersonaVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CreativeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
