import { describe, expect, it } from "vitest";
import { observedExposureEngagementRate, observedFollowerInteractionRate } from "@/lib/metrics";

describe("observed metric calculations", () => {
  it("leaves follower-normalized rate unavailable when the denominator is missing", () => {
    expect(observedFollowerInteractionRate({ likes: 30, comments: 3 })).toBeNull();
    expect(observedFollowerInteractionRate({ likes: 30, followerCount: 0 })).toBeNull();
  });

  it("calculates only from supplied follower metrics and marks partial coverage", () => {
    expect(observedFollowerInteractionRate({ likes: 30, comments: 10, followerCount: 2_000 })).toEqual({ rate: 0.02, partial: true, observedComponents: 2 });
    expect(observedFollowerInteractionRate({ likes: 30, comments: 10, shares: 5, saves: 5, followerCount: 2_000 })).toEqual({ rate: 0.025, partial: false, observedComponents: 4 });
  });

  it("uses observed impressions or reach, never a fabricated exposure value", () => {
    expect(observedExposureEngagementRate({ likes: 10 })).toEqual({ rate: null, partial: false, observedComponents: 0, exposure: null });
    expect(observedExposureEngagementRate({ likes: 10, comments: 2, impressions: 600 })).toEqual({ rate: 0.02, partial: true, observedComponents: 2, exposure: 600 });
    expect(observedExposureEngagementRate({ likes: 10, comments: 2, reach: 300 })).toEqual({ rate: 0.04, partial: true, observedComponents: 2, exposure: 300 });
  });
});
