import assignmentPack from "../../research/reference-pack-2026-10-31/assignments.json";
import evidencePack from "../../research/reference-pack-2026-10-31/evidence.json";

type CreatorEvidence = (typeof evidencePack.creators)[number];
type PostEvidence = (typeof evidencePack.posts)[number];
type PhotoEvidence = (typeof evidencePack.photos)[number];

const creators = new Map<string, CreatorEvidence>(evidencePack.creators.map((item) => [item.id, item]));
const posts = new Map<string, PostEvidence>(evidencePack.posts.map((item) => [item.id, item]));
const photos = new Map<string, PhotoEvidence>(evidencePack.photos.map((item) => [item.id, item]));

export const lockedCreativeAssignments = assignmentPack.assignments.map((item) => ({
  id: item.id,
  influencerSlug: item.persona,
  boardPath: item.board,
  direction: item.direction,
  creatorIds: item.creators,
  postIds: item.posts,
  photoSourceIds: item.photos,
  evidenceSnapshot: {
    creators: item.creators.map((id) => creators.get(id)).filter((value): value is CreatorEvidence => Boolean(value)),
    posts: item.posts.map((id) => posts.get(id)).filter((value): value is PostEvidence => Boolean(value)),
    photos: item.photos.map((id) => photos.get(id)).filter((value): value is PhotoEvidence => Boolean(value))
  }
}));

export type LockedAssignment = (typeof lockedCreativeAssignments)[number];

export function getLockedAssignment(id: string) {
  return lockedCreativeAssignments.find((item) => item.id === id);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function assignmentIntegrityMatches(row: {
  id: string;
  influencerSlug: string;
  creatorIds: unknown;
  postIds: unknown;
  photoSourceIds: unknown;
  evidenceSnapshot: unknown;
}) {
  const locked = getLockedAssignment(row.id);
  return Boolean(locked)
    && row.influencerSlug === locked?.influencerSlug
    && stable(row.creatorIds) === stable(locked?.creatorIds)
    && stable(row.postIds) === stable(locked?.postIds)
    && stable(row.photoSourceIds) === stable(locked?.photoSourceIds)
    && stable(row.evidenceSnapshot) === stable(locked?.evidenceSnapshot);
}

export function assignmentBlockReason(input: {
  id: string;
  influencerSlug: string;
  status: string;
  creatorIds: unknown;
  postIds: unknown;
  photoSourceIds: unknown;
  evidenceSnapshot: unknown;
}) {
  const locked = getLockedAssignment(input.id);
  if (!locked) return "Select one of the six locked assignment IDs.";
  if (input.influencerSlug !== locked.influencerSlug) return "This assignment belongs to a different fictional creator.";
  if (!assignmentIntegrityMatches(input)) return "The saved assignment sources differ from the locked, reviewed source pack.";
  if (input.status !== "approved") return "This assignment needs owner review before a brief can use it.";
  return null;
}

export function hasReviewedCanonicalFaceAndBody(input: { faceApproved: boolean; bodyApproved: boolean }) {
  return input.faceApproved && input.bodyApproved;
}

