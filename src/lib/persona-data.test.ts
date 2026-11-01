import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function readPersona(file: string) {
  return JSON.parse(await readFile(path.join(process.cwd(), "data/personas", file), "utf8")) as {
    name: string; age: number; bio: string; positioning: string; contentPillars: Array<{ name: string }>;
    visualIdentity: { face: string; hair: string; body: string; referenceAssetStatus: string };
  };
}

describe("initial fictional personas", () => {
  it("keeps both creators adult, disclosed, and visually distinct", async () => {
    const [mira, sana] = await Promise.all([readPersona("mira-byte.v1.json"), readPersona("sana-vale.v1.json")]);
    expect(mira.age).toBeGreaterThanOrEqual(25);
    expect(sana.age).toBeGreaterThanOrEqual(25);
    expect(mira.bio).toContain("AI-created virtual");
    expect(sana.bio).toContain("AI-created virtual");
    expect(mira.visualIdentity.hair).not.toBe(sana.visualIdentity.hair);
    expect(mira.visualIdentity.body).not.toBe(sana.visualIdentity.body);
    expect(mira.contentPillars.map((pillar) => pillar.name)).not.toEqual(sana.contentPillars.map((pillar) => pillar.name));
  });

  it("does not claim canonical images exist before they are generated and reviewed", async () => {
    for (const file of ["mira-byte.v1.json", "sana-vale.v1.json"]) {
      const persona = await readPersona(file);
      expect(persona.visualIdentity.referenceAssetStatus).toBe("generated_candidates_pending_human_approval");
    }
  });
});
