/**
 * Other Mike Salemi programs. Every one of these now lives *inside* the app:
 * each has its own detail page at /programs/$slug. Programs that already have
 * a full experience in the app (Mastering the Kettlebell, the retreats,
 * coaching) point at it via `route`.
 */

import momCover from "@/assets/programs/mom-cover.jpg.asset.json";
import tgkImage from "@/assets/programs/tgk.jpg.asset.json";
import coachImage from "@/assets/programs/coach.jpg.asset.json";
import mtkImage from "@/assets/programs/mtk.jpg.asset.json";
import fireImage from "@/assets/programs/fire.jpg.asset.json";
import a4lImage from "@/assets/programs/athleticism-4-life.png.asset.json";
import roadmapImage from "@/assets/programs/kettlebell-roadmap.png.asset.json";
import trImage from "@/assets/programs/the-training-room.png.asset.json";
import wiImage from "@/assets/programs/working-in.png.asset.json";

export type ProgramSection = {
  heading: string;
  body: string;
  points?: string[];
};

export type ExternalProgram = {
  id: string;
  slug: string;
  name: string;
  kind: "Retreat" | "Course" | "Coaching" | "Program";
  tagline: string;
  description: string;
  image: string;
  /** Accent used on the detail page hero. */
  accent: string;
  format: string;
  commitment: string;
  price: string;
  status?: "Draft" | "Preview" | "Partner Preview";
  /** Concrete price in cents when the program can be bought outright. */
  priceCents?: number;
  highlights: string[];
  sections: ProgramSection[];
  faq: { q: string; a: string }[];
  /** In-app destination when the program has a full experience here. */
  route?: string;
  routeLabel?: string;
  /** Where in the app this program is a natural next step. */
  promote: ("phase-complete" | "library" | "tools" | "dashboard")[];
};

export const externalPrograms: ExternalProgram[] = [
  {
    id: "mastering-the-kettlebell",
    slug: "mastering-the-kettlebell",
    name: "Mastering the Kettlebell",
    kind: "Course",
    tagline: "400+ videos of kettlebell technique",
    description:
      "The deep technical library behind the lifts. If Kettlebell Lifestyle is the practice, this is the encyclopedia — swing, clean, snatch, press and jerk broken down frame by frame.",
    image: mtkImage.url,
    accent: "indigo",
    format: "Self-paced video course",
    commitment: "Dip in as needed",
    price: "From $297",
    highlights: ["400+ technique videos", "Lift-by-lift progressions", "Lifetime access"],
    sections: [
      {
        heading: "What it is",
        body: "Eleven modules covering every kettlebell lift Mike teaches, from the first hinge to competition long cycle. Each lift gets a setup breakdown, a drill progression, common faults and a corrective path.",
        points: [
          "Swing, clean, snatch, press, jerk and long cycle",
          "Fault-finding videos for every position",
          "Programming templates you can drop into your week",
        ],
      },
      {
        heading: "Who it is for",
        body: "Anyone who wants the why behind the reps — lifters chasing cleaner technique, and coaches who need a reference they can point clients at.",
      },
    ],
    faq: [
      { q: "Do I need it if I'm doing Kettlebell Lifestyle?", a: "No. It's the technical companion — most people add it when a specific lift stops progressing." },
      { q: "How long do I keep access?", a: "Lifetime, including future additions to the library." },
    ],
    route: "/courses/mastering-the-kettlebell",
    routeLabel: "Open the course",
    promote: ["library", "phase-complete"],
  },
  {
    id: "the-grounded-king",
    slug: "the-grounded-king",
    name: "The Grounded King",
    kind: "Program",
    tagline: "Strength, presence and nervous-system work",
    description:
      "Mike's work on rebuilding a grounded, regulated body — breath, movement and mindset for men who want capacity that lasts beyond the gym.",
    image: tgkImage.url,
    accent: "moss",
    format: "8-week guided program",
    commitment: "4 sessions a week",
    price: "$197",
    priceCents: 19700,
    highlights: ["Breath and regulation", "Movement practice", "Mindset work"],
    sections: [
      {
        heading: "What it is",
        body: "Eight weeks of daily practice built around three pillars: breath mechanics, ground-based movement, and the inner work that keeps a man steady under load.",
        points: [
          "Daily breath protocol, 10 minutes",
          "Ground flow and mobility sessions",
          "Weekly reflection and journalling prompts",
          "Strength work that scales to any equipment",
        ],
      },
      {
        heading: "What changes",
        body: "Better sleep, a slower resting heart rate, and the ability to hold your centre in conversations and situations that used to spike you.",
      },
    ],
    faq: [
      { q: "Can I run it alongside Kettlebell Lifestyle?", a: "Yes — the breath and mobility work stack cleanly on top of your training days." },
      { q: "Do I need equipment?", a: "A single kettlebell and floor space is enough." },
    ],
    promote: ["dashboard", "phase-complete"],
  },
  {
    id: "men-of-movement",
    slug: "men-of-movement",
    name: "Men of Movement Retreats",
    kind: "Retreat",
    tagline: "In-person immersion, small group",
    description:
      "A live retreat: four days of movement, training, breathwork, ceremony and brotherhood with Mike and his team. The in-person version of everything the programs teach.",
    image: momCover.url,
    accent: "moss",
    format: "Four days, in person",
    commitment: "Capped at 20 men",
    price: "By application",
    highlights: ["Live, in person", "Small groups", "Movement, ceremony, recovery"],
    sections: [
      {
        heading: "What it is",
        body: "Two cohorts a year in Mount Shasta, California. Mornings move, afternoons go inward, and evenings are fire, food and circle.",
        points: [
          "Daily Qi Gong and team training",
          "Somatic breathwork ceremony",
          "Sweat lodge and rite of passage",
          "Full-board on private land",
        ],
      },
      {
        heading: "After you get home",
        body: "You leave with a take-home practice, a private brotherhood group and an integration call one week later.",
      },
    ],
    faq: [
      { q: "Do I need to be fit?", a: "No. Everything is scalable in the moment." },
      { q: "Is it a personal-development retreat or a training camp?", a: "Both — the training is real, and so is the inner work." },
    ],
    route: "/retreats",
    routeLabel: "See the retreats",
    promote: ["dashboard"],
  },
  {
    id: "coaching",
    slug: "coaching",
    name: "1:1 Coaching with Mike",
    kind: "Coaching",
    tagline: "Your program, built around you",
    description:
      "Direct coaching for people who want the program adapted to their body, schedule and goals — with feedback on technique and accountability week to week.",
    image: coachImage.url,
    accent: "amber",
    format: "Live video sessions",
    commitment: "Weekly or fortnightly",
    price: "From $180 / session",
    highlights: ["Personal programming", "Technique review", "Weekly accountability"],
    sections: [
      {
        heading: "How it works",
        body: "Book a session in the app, send your training footage ahead of time, and spend the call working on exactly what is limiting you. Every session ends with a written plan.",
        points: [
          "Video call with Mike, 60 or 90 minutes",
          "Technique review on your own footage",
          "A written block you can follow immediately",
          "Session notes and history kept in the app",
        ],
      },
      {
        heading: "Who it is for",
        body: "Lifters stuck at a plateau, people coming back from injury, and coaches who want their own coaching eye sharpened.",
      },
    ],
    faq: [
      { q: "Do I have to commit to a block?", a: "No. Single sessions are fine, though most people book a four-session block." },
      { q: "What if I need to move a session?", a: "Reschedule from your coaching page up to 24 hours before." },
    ],
    route: "/coaching",
    routeLabel: "Book a session",
    promote: ["tools", "phase-complete"],
  },
  {
    id: "fire",
    slug: "fire",
    name: "FIRE — First In Wellness",
    kind: "Program",
    tagline: "Training built for first responders",
    description:
      "Conditioning and resilience programming designed for the demands of first-responder work: capacity under fatigue, durable joints, faster recovery.",
    image: fireImage.url,
    accent: "clay",
    format: "12-week program",
    commitment: "3–5 sessions a week",
    price: "Partner details pending",
    status: "Partner Preview",
    highlights: ["Occupational conditioning", "Durability focus", "Recovery protocols"],
    sections: [
      {
        heading: "What it is",
        body: "Twelve weeks built around shift work: sessions that fit either side of a rotation, joint work for carrying loads, and recovery protocols for broken sleep.",
        points: [
          "Shift-friendly session lengths",
          "Loaded carries and grip durability",
          "Sleep and recovery protocols",
          "Return-to-duty conditioning benchmarks",
        ],
      },
      {
        heading: "Who it is for",
        body: "Fire, EMS, law enforcement and military — anyone whose job load is unpredictable and whose body has to keep showing up.",
      },
    ],
    faq: [
      { q: "Does it work around night shifts?", a: "Yes — every week has a shift-week variant with reduced volume." },
      { q: "What equipment do I need?", a: "A kettlebell, a pull-up bar and somewhere to walk with load." },
    ],
    promote: ["library"],
  },
  {
    id: "executive-edge", slug: "executive-edge", name: "Executive Edge", kind: "Coaching", status: "Preview",
    tagline: "A high-touch path for focus, energy and resilience", description: "An eight-week, 60-day concept combining daily five-minute practices with three to four direct coaching interactions.", image: coachImage.url, accent: "slate", format: "8 weeks / 60 days", commitment: "5 minutes daily + direct support", price: "$4,500–$5,000 Draft", highlights: ["Mental focus and energy", "Antifragility under pressure", "Personalized direct support"], sections: [{ heading: "The proposed rhythm", body: "A focused daily practice supported by a small number of high-value coaching interactions.", points: ["Daily five-minute homework", "Three to four direct interactions", "Personalized next actions"] }], faq: [], promote: ["dashboard"],
  },
  {
    id: "zen-savage", slug: "zen-savage", name: "Zen Savage Challenge", kind: "Program", status: "Draft",
    tagline: "A possible next chapter in group coaching", description: "A stakeholder concept for balancing grounded awareness with decisive action. Its relationship to The Grounded King is still being decided.", image: wiImage.url, accent: "moss", format: "Format in development", commitment: "To be confirmed", price: "Pricing Draft", highlights: ["Strength and stillness", "Guided group rhythm", "Identity-based practice"], sections: [], faq: [], promote: ["dashboard"],
  },
  {
    id: "trainer-mini-series", slug: "trainer-mini-series", name: "Kettlebell Trainer Mini-Series", kind: "Course", status: "Preview",
    tagline: "Six focused videos for trainers", description: "A free professional entry point built from short coaching demonstrations, with room to grow into a trainer toolkit.", image: trImage.url, accent: "amber", format: "6-video series", commitment: "Self-paced", price: "Free Preview", highlights: ["Coaching demonstrations", "Trainer-focused cues", "Potential toolkit pathway"], sections: [], faq: [], promote: ["tools"],
  },
  {
    id: "beginner-kettlebell-strength", slug: "beginner-kettlebell-strength", name: "Build Your First Four Kettlebell Lifts", kind: "Course", status: "Preview",
    tagline: "A result-first beginning for new kettlebell trainees", description: "A free demonstration-led pathway through the four fundamental lifts, designed as an accessible first step.", image: roadmapImage.url, accent: "indigo", format: "Demonstration series", commitment: "Self-paced", price: "Free Preview", highlights: ["Four foundational lifts", "Beginner-friendly demonstrations", "Clear next-step roadmap"], sections: [], faq: [], promote: ["library"],
  },
  {
    id: "nine-video-mini", slug: "nine-video-mini-program", name: "Nine-Video Skill Intensive", kind: "Program", status: "Draft",
    tagline: "A compact premium practice series", description: "A nine-video Vimeo-based concept whose final topic, title and positioning still need confirmation.", image: a4lImage.url, accent: "clay", format: "9-video mini-program", commitment: "Self-paced", price: "$50–$100 Draft", highlights: ["Compact learning path", "Focused video practice", "Lifetime access proposed"], sections: [], faq: [], promote: ["library"],
  },
  {
    id: "kbl-plus", slug: "kbl-plus", name: "KBL+", kind: "Program", status: "Preview",
    tagline: "The next layer beyond the core KBL path", description: "A membership expansion concept that may combine strength work, myofascial practices and new follow-up experiences.", image: roadmapImage.url, accent: "indigo", format: "Membership concept", commitment: "Ongoing", price: "Scope and pricing Draft", highlights: ["Strength follow-up", "Myofascial work", "Continuing member path"], sections: [], faq: [], promote: ["dashboard"],
  },
];

export function programsFor(slot: ExternalProgram["promote"][number], limit = 2) {
  return externalPrograms.filter((p) => p.promote.includes(slot)).slice(0, limit);
}

export function findProgram(slug: string) {
  return externalPrograms.find((p) => p.slug === slug) ?? null;
}
