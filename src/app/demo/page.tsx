"use client";

import { useState } from "react";
import styles from "./demo.module.css";

type PostIdea = {
  title: string;
  format: string;
  visual: string;
  instagram: string;
  x: string;
  image?: string;
};

type Creator = {
  slug: string;
  name: string;
  age: number;
  handle: string;
  label: string;
  bio: string;
  positioning: string;
  personality: string;
  visualIdentity: string;
  image: string;
  pillars: string[];
  ideas: PostIdea[];
};

const creators: Creator[] = [
  {
    slug: "mira-byte",
    name: "Mira Byte",
    age: 27,
    handle: "@mirabyte",
    label: "THE PLUS-SIZE GAMER GIRL",
    bio: "AI virtual creator | Thick, plus-size gamer girl into PC setups, game culture, gamer streetwear and original cosplay. Fictional; AI-generated.",
    positioning: "A confident, voluptuous BBW gamer girl with a full bust, broad hips, and a prominent rounded butt, known for playful gaming commentary, plus-size gamer fashion, expressive cosplay concepts, and setup ideas.",
    personality: "Witty, confident, lightly flirty, and specific. She talks in gamer metaphors, has opinions about gaming culture, and uses affectionate humor. She never claims real gameplay, purchases, or event attendance.",
    visualIdentity: "White woman · fair warm skin · heart-shaped face · right-cheek beauty mark · espresso bob with teal underlayer · thick BBW figure with full bust, broad hips, and prominent butt · bare face, no makeup",
    image: "/characters/mira-byte-candidate-v2.png",
    pillars: ["Gaming culture", "PC setup concepts", "Plus-size streetwear", "Original cosplay", "Gamer humor"],
    ideas: [
      {
        title: "The setup side quest",
        format: "Instagram carousel · X post",
        visual: "A teal-violet gaming desk, with Mira in frame and a close-up of the setup details.",
        image: "/posts/mira-byte-setup-post-v2.png",
        instagram: "Setup side quest: keep the glow, tame the cable chaos. What gets the next upgrade: lighting, storage, or a snack shelf? 🎮",
        x: "Setup side quest: cable clutter is the final boss. What should the desk get next: better lighting, more storage, or a snack shelf?",
      },
      {
        title: "Gamer streetwear fit check",
        format: "Instagram photo set · X poll",
        visual: "Full-body outfit photo, then detail crops of the jacket, color blocking, and fit.",
        instagram: "Gamer streetwear, built around the silhouette first and the color palette second. Team teal jacket or violet layer?",
        x: "Choose the next fit color: teal, violet, or coral?",
      },
      {
        title: "Original fantasy loadout",
        format: "Instagram Reel · X poll",
        visual: "An original teal-violet-coral fantasy outfit, shown from fabric details to the finished look. No game or franchise costume.",
        instagram: "A fantasy loadout with no franchise attached. Which detail should lead the next design: the cape, the armor panels, or the color?",
        x: "Design poll: teal armor, violet cape, coral accents. Keep all three or drop one?",
      },
      {
        title: "The settings-menu final boss",
        format: "Instagram meme carousel · X post",
        visual: "A three-panel gamer joke: launch screen, settings menu, and an over-customized character creator.",
        instagram: "The game is ready. The settings menu has requested one more side quest. What’s your most familiar pre-game detour?",
        x: "You opened the game. Forty minutes later: settings, keybinds, character creator. What’s your pre-game side quest?",
      },
    ],
  },
  {
    slug: "sana-vale",
    name: "Sana Vale",
    age: 26,
    handle: "@sanavale.fit",
    label: "FITNESS · MAKEUP · BEAUTY",
    bio: "AI virtual creator | Slim-fit fitness and beauty girl sharing workout ideas, gym style, makeup looks and skincare notes. Fictional; AI-generated.",
    positioning: "A slim, fit, athletic beauty-and-workout influencer with an approachable, polished style: practical training concepts, makeup looks, gym fashion and wellness without miracle claims.",
    personality: "Polished, encouraging, and direct, with a little dry humor. She explains fitness and beauty ideas plainly, avoids miracle promises, and makes room for different bodies and routines.",
    visualIdentity: "White woman · fair neutral skin · oval face · hazel-green eyes · small left-cheek dimple · long dark-brown curls in a high puff · slim athletic build",
    image: "/characters/sana-vale-candidate-v2.png",
    pillars: ["Workout ideas", "Gym fashion", "Makeup looks", "Skincare notes", "Recovery & wellness"],
    ideas: [
      {
        title: "Lilac meets copper",
        format: "Instagram makeup carousel · X post",
        visual: "Close-up color study: lilac on the lid, copper accent, then a finished look in soft daylight.",
        image: "/posts/sana-vale-makeup-post-v2.png",
        instagram: "Lilac on the lid, a little copper at the edge, and soft daylight doing its part. Which shade would you make the focus?",
        x: "Lilac + copper: keep the look soft or push the contrast? Taking votes for the next color study.",
      },
      {
        title: "A no-hype training outline",
        format: "Instagram carousel · X question",
        visual: "A warm-up, a few general movement patterns, and a calm finish. Exercise details get reviewed before publication.",
        instagram: "A simple session outline: warm up, choose a push, a pull, and a lower-body movement that fits your level, then leave room for a cool-down. Save the structure; adjust the details to your needs.",
        x: "A useful workout plan starts with a warm-up and movements that suit your level. What would help more next: a form checklist or a beginner-friendly session outline?",
      },
      {
        title: "Gym-bag edit",
        format: "Instagram flatlay · X question",
        visual: "A neat, unbranded bag layout with basic training items and a short packing checklist.",
        instagram: "The gym-bag edit: useful basics, a spare hair tie, and enough room for the thing you always forget. What belongs on your must-pack list?",
        x: "Gym-bag check: what’s the one small thing you’re happiest to have remembered?",
      },
      {
        title: "Recovery corner",
        format: "Instagram lifestyle photo · X post",
        visual: "Warm daylight on a mat, water glass, and neutral beauty items. No products are named or endorsed.",
        instagram: "A quieter corner for the in-between days. Keep the reset simple: a little space, a little breathing room, and no pressure to turn rest into another task.",
        x: "Rest-day reminder: recovery doesn’t need an elaborate routine. What helps you make a little room to reset?",
      },
    ],
  },
];

export default function DemoPage() {
  const [selectedSlug, setSelectedSlug] = useState(creators[0].slug);
  const creator = creators.find((entry) => entry.slug === selectedSlug) ?? creators[0];

  return <main className={styles.shell}>
    <header className={styles.header}>
      <a className={styles.brand} href="/demo"><span className={styles.brandMark}>AI<span>·</span>IS</span><span><b>INFLUENCER</b><small>STUDIO</small></span></a>
      <div className={styles.headerLabel}>CHARACTER DESIGN <i /> CONTENT IDEAS</div>
      <span className={styles.previewTag}><i /> PREVIEW · NO LIVE POSTS</span>
    </header>

    <section className={styles.intro}>
      <div className={styles.eyebrow}>TWO FICTIONAL ADULT CREATORS · VISUAL CANDIDATES + FIRST POSTS</div>
      <h1>Meet the characters.<br /><em>Then give them something to say.</em></h1>
      <p>Distinct virtual personalities, original images, and platform-specific draft posts. The imagery is AI-generated; these concepts have not been published.</p>
    </section>

    <nav className={styles.creatorTabs} aria-label="Choose a creator">
      {creators.map((entry) => <button key={entry.slug} onClick={() => setSelectedSlug(entry.slug)} className={creator.slug === entry.slug ? styles.activeTab : ""}>
        <img src={entry.image} alt="" /><span><b>{entry.name}</b><small>{entry.label}</small></span><i>{creator.slug === entry.slug ? "●" : "○"}</i>
      </button>)}
    </nav>

    <section className={styles.profileGrid}>
      <figure className={styles.heroImage}>
        <img src={creator.image} alt={`AI-generated visual candidate for ${creator.name}`} />
        <figcaption><span>ORIGINAL AI IMAGE</span><span>CHARACTER CANDIDATE · REVIEW PENDING</span></figcaption>
      </figure>
      <article className={styles.profile}>
        <div className={styles.eyebrow}>{creator.label} <span>·</span> AGE {creator.age}</div>
        <div className={styles.titleRow}><h2>{creator.name}</h2><span className={styles.handle}>{creator.handle} · suggestion</span></div>
        <p className={styles.bio}>{creator.bio}</p>
        <p className={styles.positioning}>{creator.positioning}</p>
        <div className={styles.profileDivider} />
        <div className={styles.detailBlock}><small>VOICE & PERSONALITY</small><p>{creator.personality}</p></div>
        <div className={styles.detailBlock}><small>VISUAL IDENTITY</small><p>{creator.visualIdentity}</p></div>
        <div className={styles.detailBlock}><small>CONTENT PILLARS</small><div className={styles.pillars}>{creator.pillars.map((pillar) => <span key={pillar}>{pillar}</span>)}</div></div>
        <div className={styles.disclosure}>ⓘ Fictional AI-generated virtual creator. No real person is depicted.</div>
      </article>
    </section>

    <section className={styles.ideasSection}>
      <div className={styles.sectionHeading}><div><div className={styles.eyebrow}>FIRST CONTENT SET · 4 ORIGINAL CONCEPTS</div><h2>Post ideas for Instagram and X.</h2></div><span className={styles.draftLabel}>DRAFTS · NOT SCHEDULED</span></div>
      <div className={styles.ideaGrid}>{creator.ideas.map((idea, index) => <article className={styles.ideaCard} key={idea.title}>
        {idea.image ? <div className={styles.ideaImage}><img src={idea.image} alt={`AI-generated post image candidate for ${idea.title}`} /><span>POST IMAGE CANDIDATE</span></div> : <div className={`${styles.ideaVisual} ${creator.slug === "mira-byte" ? styles.gamerVisual : styles.fitnessVisual}`}><span>VISUAL BRIEF · {String(index + 1).padStart(2, "0")}</span><b>{idea.visual}</b></div>}
        <div className={styles.ideaBody}>
          <div className={styles.ideaMeta}><span>IDEA {String(index + 1).padStart(2, "0")}</span><small>{idea.format}</small></div>
          <h3>{idea.title}</h3>
          <div className={styles.caption}><small>INSTAGRAM DRAFT</small><p>{idea.instagram}</p></div>
          <div className={styles.caption + " " + styles.xCaption}><small>X DRAFT</small><p>{idea.x}</p></div>
        </div>
      </article>)}</div>
    </section>

    <footer className={styles.footer}><p>Image source: built-in image generation for this prototype, not Fine Photo Gen. Fine Photo Gen, Instagram, and X are not connected here.</p><p>Visuals and post copy are original candidates for review. No real performance data, endorsements, or publishing activity.</p></footer>
  </main>;
}
