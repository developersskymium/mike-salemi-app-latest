/**
 * Men of Movement Retreats.
 *
 * Source of truth: Mike Salemi's live site (mikesalemi.io/retreats, checked Oct 2026).
 * The Primal Reset is no longer listed there; its details come from the older
 * mikesalemi.io/old page. Only verified details are filled in — anything the
 * site doesn't publish (packing lists, documents, prices) is left empty and the
 * pages say it's shared after acceptance.
 */

import { retreatCovers } from "@/content/retreat-gallery";

export type RetreatDay = {
  id: string;
  label: string;
  title: string;
  items: string[];
};

export type Facilitator = {
  name: string;
  role: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  help?: string;
};

export type Retreat = {
  id: string;
  slug: string;
  name: string;
  season: string;
  tagline: string;
  description: string;
  image: string;
  location: string;
  address: string;
  mapQuery: string;
  /** ISO start/end of the retreat. */
  startsAt: string;
  endsAt: string;
  /** Set when the dates are a placeholder for app testing, not announced by Mike. */
  demoDates?: boolean;
  durationLabel: string;
  capacity: number;
  status: "open" | "waitlist" | "past";
  price: string;
  ctaLabel: string;
  highlights: string[];
  itinerary: RetreatDay[];
  facilitators: Facilitator[];
  prerequisites: ChecklistItem[];
  packing: ChecklistItem[];
  downloads: { id: string; label: string; note: string }[];
  faq: { q: string; a: string }[];
  aftercare: string[];
};

/** Common Questions, verbatim from mikesalemi.io/retreats. */
const sharedFaq = [
  {
    q: "I'm not in great physical shape. Can I handle this?",
    a: "Yes. The physical practices are scaled to meet you where you are. This isn't about performance. If you can walk, breathe, and move with some intention, you can do this.",
  },
  {
    q: "I've never done this kind of work before. Will I be out of place?",
    a: "Not at all. About half the men who come are new to this. The other half are returning because they got so much from the first time. That mix is part of what makes it work.",
  },
  {
    q: "What if I'm not married or don't have kids?",
    a: "You don't need to be. This work is about your relationship with yourself first. Whether you're single, partnered, a father, or not, it applies directly to where you are right now.",
  },
  {
    q: "How emotionally intense does it get?",
    a: "You're always in charge of how far you go. Some men leave having broken something open they've been carrying for years. Some leave with a quiet shift that takes a few weeks to fully land. All of it counts. And you're guided through every step with care.",
  },
];

/** "After the Mountain", from mikesalemi.io/retreats. */
const sharedAftercare = [
  "Men of Movement: Preparation — a practice program Mike builds for each retreat, sent in the weeks before, with foundational breathwork and meditation",
  "Daily practices to take home — breathwork and body practices from the retreat",
  "The Brotherhood — a private group with the men you went through it alongside",
  "Men of Movement: Integration — a group call one week after the retreat",
  "Continued pathways — The Grounded King, 1:1 coaching, private retreats and other offerings",
];

export const retreats: Retreat[] = [
  {
    id: "breakthrough",
    slug: "breakthrough",
    name: "The Breakthrough",
    season: "Spring Retreat",
    tagline: "Four days in Mount Shasta. This is where we go deep.",
    description:
      "What most men haven't had is four uninterrupted days away from everything, in the right place, with the right people around them. We work with the patterns running underneath the surface, built long before you had any say in them, and we begin to change them — in your body, through ceremony and breathwork and the kind of depth that only full immersion can reach. You arrive welcomed like family into a private sanctuary in Mount Shasta, held by a master landscape architect. Every meal is prepared by Lauren Salemi.",
    image: retreatCovers.breakthrough,
    location: "Private sanctuary, Mount Shasta, Northern California",
    address: "Mount Shasta, Northern California (exact venue shared after acceptance)",
    mapQuery: "Mount Shasta CA",
    startsAt: "2027-05-13T12:00:00-07:00",
    endsAt: "2027-05-16T12:00:00-07:00",
    durationLabel: "4 days",
    capacity: 20,
    status: "open",
    price: "By application",
    ctaLabel: "Apply for May 13-16, 2027",
    highlights: [
      "Daily Qi Gong with Dr. Jonny Suarez — one movement per day",
      "Somatic breathwork ceremony, the largest release of the retreat",
      "Sweat lodge and rite of passage led by an elder with over fifty years in this work",
      "Sensory ceremony dinners prepared by Lauren Salemi",
    ],
    itinerary: [
      {
        id: "day-1",
        label: "Day I",
        title: "Arrival & Connection",
        items: ["Airport pickup", "Team workout", "Shared meal", "Circle opens with agreements and intentions", "Evening fire with one question"],
      },
      {
        id: "day-2",
        label: "Day II",
        title: "Opening & Release",
        items: ["Qi Gong", "Archetypal work and hot seats", "Breathwork ceremony"],
      },
      {
        id: "day-3",
        label: "Day III",
        title: "Into the Fire",
        items: ["Move to Tim's outdoor school at Headwaters", "Tobacco ceremony", "Sweat lodge", "Creek plunge", "Rite of passage"],
      },
      {
        id: "day-4",
        label: "Day IV",
        title: "Celebration & Return",
        items: ["Cacao ceremony", "Visualization of the man you're stepping into", "Shared reflection closes the arc"],
      },
    ],
    facilitators: [
      { name: "Mike Salemi", role: "Founder · Lead Facilitator" },
      { name: "Dr. Jonny Suarez", role: "Chinese Medicine · Functional Medicine · Qi Gong" },
      { name: "Greg Schmaus", role: "Archetypal & Constellation Facilitator" },
      { name: "Tim Corcoran", role: "Wilderness Elder · Headwaters Outdoor School (guest, select retreats)" },
      { name: "Lauren Salemi", role: "Private Chef · Holistic Coach · Food Ceremony" },
    ],
    prerequisites: [],
    packing: [],
    downloads: [],
    faq: sharedFaq,
    aftercare: sharedAftercare,
  },
  {
    id: "primal-reset",
    slug: "primal-reset",
    name: "The Primal Reset",
    season: "Fall Retreat",
    tagline: "This retreat shuts it all off.",
    description:
      "You're drowning in modern life. The constant connectivity. The pressure that never stops. The noise. Days on Tim Corcoran's land in Mt. Shasta — full immersion in nature. No phones. No distractions. Just the land, the elements, and your brothers. This retreat is for the man who needs to unplug, remember, and reset.",
    image: retreatCovers.primalReset,
    location: "Tim Corcoran's land, Mt. Shasta, California",
    address: "Mt. Shasta, California (details provided after acceptance)",
    mapQuery: "Mount Shasta CA",
    // DEMO: last published dates were Sept 3-6, 2026 (past). Placeholder for app testing only.
    startsAt: "2027-09-02T12:00:00-07:00",
    endsAt: "2027-09-05T12:00:00-07:00",
    demoDates: true,
    durationLabel: "3 nights, 4 days",
    capacity: 20,
    status: "waitlist",
    price: "By application",
    ctaLabel: "Join the waitlist",
    highlights: [
      "Complete nature immersion — sleep under the stars, wake with the sun",
      "Nature-based practices — shelter building, fire making, solo time",
      "Night hikes — moving through darkness, trusting instincts",
      "Team challenges — building, creating, problem-solving with your brothers",
      "Men's work & movement — breathwork, movement, ritual",
      "All ceremonies, all meals (dietary needs accommodated) and sleeping on the land",
    ],
    itinerary: [],
    facilitators: [
      { name: "Mike Salemi", role: "Founder · Lead Facilitator" },
      { name: "Tim Corcoran", role: "Wilderness Elder · Headwaters Outdoor School" },
    ],
    prerequisites: [],
    packing: [],
    downloads: [],
    faq: sharedFaq,
    aftercare: sharedAftercare,
  },
];

export function findRetreat(slug: string) {
  return retreats.find((r) => r.slug === slug) ?? null;
}

export function retreatWindow(retreat: Retreat, now = new Date('2026-10-01T12:00:00Z').getTime()) {
  const start = new Date(retreat.startsAt).getTime();
  const end = new Date(retreat.endsAt).getTime();
  if (now < start) return "before" as const;
  if (now > end) return "after" as const;
  return "during" as const;
}

export function formatRetreatDates(retreat: Retreat) {
  const start = new Date(retreat.startsAt);
  const end = new Date(retreat.endsAt);
  const sameMonth = start.getMonth() === end.getMonth();
  const month = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const range = sameMonth
    ? `${month} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
    : `${month} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  return retreat.demoDates ? `${range} · Demo date, TBD` : range;
}
