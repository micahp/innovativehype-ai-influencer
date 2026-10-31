import { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { annualStrategy } from "../src/lib/strategy";
import { lockedCreativeAssignments } from "../src/lib/creative-assignments";

const personas = [
  { slug: "mira-byte", json: "mira-byte.v1.json" },
  { slug: "sana-vale", json: "sana-vale.v1.json" }
];

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function main() {
  const influencers = new Map<string, string>();
  for (const entry of personas) {
    const spec = JSON.parse(await readFile(path.join(process.cwd(), "data/personas", entry.json), "utf8")) as Record<string, unknown>;
    const influencer = await prisma.influencer.upsert({
      where: { slug: entry.slug },
      update: { name: String(spec.name), suggestedHandle: String((spec.handleSuggestions as string[])[0]), bio: String(spec.bio) },
      create: { slug: entry.slug, name: String(spec.name), suggestedHandle: String((spec.handleSuggestions as string[])[0]), bio: String(spec.bio) }
    });
    influencers.set(entry.slug, influencer.id);

    const latestPersona = await prisma.personaVersion.findFirst({ where: { influencerId: influencer.id }, orderBy: { version: "desc" } });
    let personaVersion = latestPersona;
    if (!latestPersona) {
      personaVersion = await prisma.personaVersion.create({ data: { influencerId: influencer.id, version: 1, spec: spec as Prisma.InputJsonValue, notes: "Initial fictional identity specification. Canonical visual references are pending owner upload and human approval." } });
    } else if (canonical(latestPersona.spec) !== canonical(spec)) {
      personaVersion = await prisma.personaVersion.create({ data: { influencerId: influencer.id, version: latestPersona.version + 1, spec: spec as Prisma.InputJsonValue, notes: "Seed persona specification changed; previous version retained for audit." } });
    }

    const strategyPlan = annualStrategy(entry.slug);
    const latestStrategy = await prisma.annualStrategy.findFirst({ where: { influencerId: influencer.id, year: 2026 }, orderBy: { version: "desc" } });
    if (!latestStrategy) {
      await prisma.annualStrategy.create({ data: { influencerId: influencer.id, year: 2026, version: 1, plan: strategyPlan as Prisma.InputJsonValue } });
    } else if (canonical(latestStrategy.plan) !== canonical(strategyPlan)) {
      await prisma.annualStrategy.create({ data: { influencerId: influencer.id, year: 2026, version: latestStrategy.version + 1, plan: strategyPlan as Prisma.InputJsonValue } });
    }

    for (const platform of ["instagram", "x"]) {
      await prisma.socialAccount.upsert({
        where: { influencerId_platform: { influencerId: influencer.id, platform } },
        update: {},
        create: { influencerId: influencer.id, platform, status: "not_connected" }
      });
    }
  }

  for (const assignment of lockedCreativeAssignments) {
    const influencerId = influencers.get(assignment.influencerSlug);
    if (!influencerId) throw new Error(`No seeded persona exists for assignment ${assignment.id}.`);
    await prisma.creativeAssignment.upsert({
      where: { id: assignment.id },
      update: {},
      create: {
        id: assignment.id,
        influencerId,
        boardPath: assignment.boardPath,
        direction: assignment.direction,
        creatorIds: assignment.creatorIds as Prisma.InputJsonValue,
        postIds: assignment.postIds as Prisma.InputJsonValue,
        photoSourceIds: assignment.photoSourceIds as Prisma.InputJsonValue,
        evidenceSnapshot: assignment.evidenceSnapshot as Prisma.InputJsonValue,
        status: "pending_owner_review"
      }
    });
  }

  await prisma.systemSetting.upsert({ where: { key: "publishing_mode" }, update: {}, create: { key: "publishing_mode", value: "human_approval" } });
  await prisma.systemSetting.upsert({ where: { key: "publishing_paused" }, update: {}, create: { key: "publishing_paused", value: true } });
  console.log("Seeded the two fictional identities, annual strategies, and six pending creative assignments. No content briefs or production jobs were selected or created.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
