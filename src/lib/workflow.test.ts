import { describe, expect, it } from "vitest";
import { isLivePublishFormatSupported, mayRunDryRun, mayRunLivePublish, maySchedule } from "@/lib/workflow";

describe("content workflow guards", () => {
  it("schedules only approved briefs", () => {
    expect(maySchedule("approved")).toBe(true);
    expect(maySchedule("draft")).toBe(false);
    expect(maySchedule("changes_requested")).toBe(false);
  });

  it("runs a dry-run once for a scheduled post and never republishes a terminal item", () => {
    expect(mayRunDryRun("scheduled", false)).toBe(true);
    expect(mayRunDryRun("published_dry_run", true)).toBe(false);
    expect(mayRunDryRun("failed", false)).toBe(false);
  });

  it("requires all explicit gates before live publishing", () => {
    const ready = { scheduledStatus: "scheduled", hasPublishedPost: false, paused: false, liveEnabled: true, mode: "human_approval", approved: true, due: true };
    expect(mayRunLivePublish(ready)).toBe(true);
    expect(mayRunLivePublish({ ...ready, paused: true })).toBe(false);
    expect(mayRunLivePublish({ ...ready, liveEnabled: false })).toBe(false);
    expect(mayRunLivePublish({ ...ready, approved: false })).toBe(false);
    expect(mayRunLivePublish({ ...ready, due: false })).toBe(false);
    expect(mayRunLivePublish({ ...ready, hasPublishedPost: true })).toBe(false);
    expect(mayRunLivePublish({ ...ready, mode: "draft" })).toBe(false);
  });

  it("limits live publishing to formats each adapter can actually send", () => {
    expect(isLivePublishFormatSupported("instagram", "single_image", true)).toBe(true);
    expect(isLivePublishFormatSupported("instagram", "carousel", true)).toBe(false);
    expect(isLivePublishFormatSupported("x", "text_post", false)).toBe(true);
    expect(isLivePublishFormatSupported("x", "single_image", true)).toBe(true);
    expect(isLivePublishFormatSupported("x", "short_video", true)).toBe(false);
  });
});
