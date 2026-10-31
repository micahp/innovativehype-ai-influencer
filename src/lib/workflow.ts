export function maySchedule(briefStatus: string) {
  return briefStatus === "approved";
}

export function mayRunDryRun(scheduledStatus: string, hasPublishedPost: boolean) {
  return scheduledStatus === "scheduled" && !hasPublishedPost;
}

export function mayRunLivePublish(input: { scheduledStatus: string; hasPublishedPost: boolean; paused: boolean; liveEnabled: boolean; mode: string; approved: boolean; due: boolean }) {
  return input.scheduledStatus === "scheduled"
    && !input.hasPublishedPost
    && !input.paused
    && input.liveEnabled
    && ["human_approval", "automatic_preapproved", "conditional_autopublish"].includes(input.mode)
    && input.approved
    && input.due;
}

export function isLivePublishFormatSupported(platform: string, format: string, hasMediaAsset: boolean) {
  if (platform === "instagram") return format === "single_image" && hasMediaAsset;
  if (platform === "x") return (format === "text_post" && !hasMediaAsset) || (format === "single_image" && hasMediaAsset);
  return false;
}
