import { describe, expect, it } from "vitest";
import {
  assignmentBlockReason,
  assignmentIntegrityMatches,
  hasReviewedCanonicalFaceAndBody,
  lockedCreativeAssignments
} from "@/lib/creative-assignments";

function row(id = "M-01") {
  const assignment = lockedCreativeAssignments.find((item) => item.id === id)!;
  return {
    id: assignment.id,
    influencerSlug: assignment.influencerSlug,
    status: "approved",
    creatorIds: assignment.creatorIds,
    postIds: assignment.postIds,
    photoSourceIds: assignment.photoSourceIds,
    evidenceSnapshot: assignment.evidenceSnapshot
  };
}

describe("locked creative assignments", () => {
  it("contains only the six owner-specified IDs", () => {
    expect(lockedCreativeAssignments.map((assignment) => assignment.id)).toEqual(["M-01", "M-02", "M-03", "S-01", "S-02", "S-03"]);
  });

  it("resolves every locked source ID and does not add unverified performance counts", () => {
    for (const assignment of lockedCreativeAssignments) {
      expect(assignment.evidenceSnapshot.creators).toHaveLength(assignment.creatorIds.length);
      expect(assignment.evidenceSnapshot.posts).toHaveLength(assignment.postIds.length);
      expect(assignment.evidenceSnapshot.photos).toHaveLength(assignment.photoSourceIds.length);
      for (const post of assignment.evidenceSnapshot.posts) {
        expect(post).not.toHaveProperty("views");
        expect(post).not.toHaveProperty("likes");
      }
    }
  });

  it("rejects an unknown assignment ID", () => {
    expect(assignmentBlockReason({ ...row(), id: "M-99" })).toMatch(/six locked/i);
  });

  it("rejects an assignment used for the other fictional creator", () => {
    expect(assignmentBlockReason({ ...row(), influencerSlug: "sana-vale" })).toMatch(/different fictional creator/i);
  });

  it("does not allow use before owner approval", () => {
    expect(assignmentBlockReason({ ...row(), status: "pending_owner_review" })).toMatch(/owner review/i);
  });

  it("rejects an unapproved source swap in the persisted assignment", () => {
    const altered = row();
    altered.postIds = ["P99"];
    expect(assignmentIntegrityMatches(altered)).toBe(false);
    expect(assignmentBlockReason(altered)).toMatch(/locked, reviewed source pack/i);
  });

  it("does not allow generation until face and body canon are both reviewed", () => {
    expect(hasReviewedCanonicalFaceAndBody({ faceApproved: true, bodyApproved: false })).toBe(false);
    expect(hasReviewedCanonicalFaceAndBody({ faceApproved: false, bodyApproved: true })).toBe(false);
    expect(hasReviewedCanonicalFaceAndBody({ faceApproved: true, bodyApproved: true })).toBe(true);
  });
});
