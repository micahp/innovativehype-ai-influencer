const monthlyThemes = {
  "2026-11": ["Creator setup rituals", "Community questions", "Cozy-season routines"],
  "2026-12": ["Year-end recaps", "Gift guides without endorsements", "Low-pressure holiday routines"],
  "2027-01": ["Fresh-start experiments", "Beginner-friendly explainers", "Habit systems"],
  "2027-02": ["Creative collaboration prompts", "Color and style studies", "Community spotlights"],
  "2027-03": ["Spring refresh", "Skill-building series", "Behind-the-concept posts"],
  "2027-04": ["Tutorial month", "Audience Q&A", "Repeatable weekly formats"],
  "2027-05": ["Outdoor and daylight settings", "Routine adaptations", "Seasonal wardrobe ideas"],
  "2027-06": ["Summer schedule experiments", "Short-form storytelling", "Creator workflow notes"],
  "2027-07": ["Midyear review", "Audience-requested topics", "Format comparison"],
  "2027-08": ["Back-to-routine systems", "Workspace refresh", "Practical checklists"],
  "2027-09": ["Skill progression", "Autumn palette studies", "Community-led prompts"],
  "2027-10": ["Year-one retrospective", "Best-of format review", "Next-cycle hypotheses"]
} as const;

const nicheFocus = {
  "mira-byte": [
    "Compare desk setups by the problem they solve, not by price or brand.", "Share game-night rituals and invite audience recommendations.",
    "Use an original cozy gaming scene and explain the creative choices.", "Review the year's play habits without inventing game statistics.",
    "Create a fictional gift-guide format with no endorsements or purchase claims.", "Share a low-pressure community play prompt.",
    "Test one new recurring gaming commentary format.", "Explain one beginner-friendly PC setup concept.",
    "Build a small co-op conversation around audience suggestions.", "Try an original color and wardrobe study inspired by game genres.",
    "Show how an original cosplay concept moves from palette to outfit.", "Answer audience questions about choosing a comfortable desk setup.",
    "Compare two caption hooks while keeping the visual format consistent.", "Show an outdoor gaming-inspired editorial scene without implying a real event.",
    "Adapt a setup concept for limited desk space.", "Tell a short fictional narrative about a side quest and label it as fiction.",
    "Review a content format with observed account metrics only.", "Revisit audience-requested games and state any knowledge limits.",
    "Share an autumn palette translated into original gamer streetwear.", "Summarize which hypotheses have enough evidence to keep testing."
  ],
  "sana-vale": [
    "Compare a gym-bag setup by practical use, without recommending brands.", "Share a gentle movement warm-up concept with clear safety framing.",
    "Create a cozy recovery-day editorial scene and invite routine ideas.", "Review the year's content formats using observed account data only.",
    "Share a fictional self-care gift-guide format without endorsements.", "Invite followers to choose between two makeup color palettes.",
    "Test one new recurring tutorial format.", "Explain a general skincare label-reading concept without medical claims.",
    "Build a low-impact mobility sequence with a reminder to adapt to individual needs.", "Try an original activewear color study in natural daylight.",
    "Show a makeup look as a step-by-step editorial concept.", "Answer audience questions about balancing training and rest in general terms.",
    "Compare two caption hooks while keeping the tutorial format consistent.", "Create an outdoor movement-inspired editorial scene without claiming a workout occurred.",
    "Adapt a workout concept for a small space with safe alternatives.", "Explain a fictional desk-to-gym transition as a visual story.",
    "Review a content format with observed account metrics only.", "Share a recovery routine concept without promising health outcomes.",
    "Translate an autumn palette into gym-to-street styling.", "Summarize which hypotheses have enough evidence to keep testing."
  ]
} as const;

export function annualStrategy(slug: string) {
  const isGamer = slug === "mira-byte";
  const months = Object.entries(monthlyThemes).map(([month, generalThemes]) => ({
    month,
    themes: [generalThemes[0], nicheFocus[slug as keyof typeof nicheFocus]?.[Number(month.slice(-2)) % 20] ?? generalThemes[1], generalThemes[2]],
    platforms: isGamer ? ["instagram", "x"] : ["instagram", "x"],
    experiment: isGamer
      ? "Compare a setup-led visual with a personality-led caption; record the hypothesis before publishing."
      : "Compare a tutorial-led visual with an outfit-led visual; record the hypothesis before publishing.",
    measurement: "Use platform-reported reach or impressions when available; keep unavailable values missing and review confidence before changing the plan."
  }));

  return {
    planningModel: "rolling",
    periodStart: "2026-11-01",
    periodEnd: "2027-10-31",
    positioning: isGamer
      ? "Fictional adult gamer personality with plus-size style, setup curiosity, and specific game culture commentary."
      : "Fictional adult fitness-and-beauty personality focused on approachable routines, honest beauty information, and recovery.",
    audienceGrowthObjectives: [
      "Establish a transparent AI creator identity and recognizable recurring formats.",
      "Build a baseline from observed reach, engagement, and audience response before setting numerical growth targets.",
      "Use monthly experiments to learn which formats merit more production effort."
    ],
    contentPillars: isGamer
      ? ["Play Notes", "Setup Lab", "Style Queue", "Co-op Energy", "Off-screen Reset"]
      : ["Move Well", "Beauty Notes", "Gym Edit", "Recovery Practice", "Everyday Rhythm"],
    formatMix: { evergreen: 0.55, trendResponsive: 0.1, educational: 0.15, entertainment: 0.1, interaction: 0.1 },
    cadence: { instagram: "3 posts per week; use carousels or short-form video only when the concept needs them.", x: "4 posts per week; prioritize conversation starters and short editorial notes." },
    monetization: "Do not pursue sponsorships or affiliate placements until identity disclosure, audience fit, and compliant disclosure workflows are ready.",
    quarterlyReviews: [
      { quarter: "Q1", focus: "Identity consistency, workflow stability, and reliable baselines." },
      { quarter: "Q2", focus: "Compare content pillars and test only one major variable at a time." },
      { quarter: "Q3", focus: "Reduce production effort on low-confidence, low-value formats." },
      { quarter: "Q4", focus: "Review year-long evidence and set the next cycle's hypotheses." }
    ],
    months
  };
}
