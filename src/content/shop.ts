/**
 * Mini shop — digital workshops, downloadable plans and physical equipment.
 * Prices are in cents so the demo checkout can record an exact amount.
 */

import { coursePlans, type PlanDownload } from "@/content/plans";
import bulgarianBagImage from "@/assets/shop-bulgarian-bag.jpg";
import downshiftImage from "@/assets/shop-downshift.jpg";
import planImage from "@/assets/shop-plan.jpg";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  type: "digital" | "physical";
  priceCents: number;
  tagline: string;
  description: string;
  bullets: string[];
  variants?: { id: string; label: string; priceCents: number }[];
  note?: string;
  /** Optional direct file for digital items already bundled in the app. */
  fileUrl?: string;
  /** Product photography. */
  image?: string;
  /** Sold by application: no price, the button opens an inquiry instead of checkout. */
  inquiry?: { label: string; to: "/coaching" | "/retreats" };
};

const bagSizes = [
  ["x-small", "X-Small · 12 lb", 13600],
  ["small", "Small · 17 lb", 14600],
  ["medium", "Medium · 26 lb", 16600],
  ["large", "Large · 37 lb", 19600],
  ["x-large", "X-Large · 50 lb", 22600],
  ["xx-large", "XX-Large · 61 lb", 25600],
] as const;

const planProducts: ShopProduct[] = coursePlans("beginner").map((plan: PlanDownload) => ({
  id: `plan-${plan.id}`,
  slug: `plan-${plan.id}`,
  name: `${plan.title} — printable plan`,
  type: "digital",
  priceCents: 0,
  tagline: "Included with your program",
  description:
    "The printable phase plan: every day laid out with its focus, so you can train from paper when you would rather leave the phone alone.",
  bullets: ["Full phase breakdown", "Print or save to your phone", "Included with Kettlebell Lifestyle"],
  fileUrl: plan.url,
  image: planImage,
}));

void planProducts;
void downshiftImage;

export const shopProducts: ShopProduct[] = [
  {
    id: "bulgarian-bag",
    slug: "suples-bulgarian-bag",
    name: "Suples Bulgarian Bag® — Original Leather",
    type: "physical",
    priceCents: 13600,
    tagline: "Tri-planar loading no other tool gives you",
    description:
      "The original leather Bulgarian Bag, made in Bulgaria. It stands in for kettlebells, dumbbells, medicine balls, weight vests and barbells, and opens up rotational work you cannot replicate with a bell.",
    bullets: [
      "Leather construction, made in Bulgaria",
      "Six sizes from X-Small to XX-Large",
      "Tri-planar swings, spins and throws",
      "Suits every sport",
    ],
    image: bulgarianBagImage,
    variants: bagSizes.map(([id, label, priceCents]) => ({ id, label, priceCents })),
    note: "USA orders only.",
  },
  {
    id: "coaching-intensive",
    slug: "1-on-1-coaching-intensive",
    name: "1-on-1 Coaching Intensive with Mike",
    type: "digital",
    priceCents: 0,
    tagline: "Technique and movement, coached personally",
    description:
      "A private video session with Mike to review your technique, your training plan and what to work on next.",
    bullets: ["Private video call", "Technique review", "Personal next-step plan"],
    image: planImage,
    inquiry: { label: "Request booking", to: "/coaching" },
    note: "Application required — Mike's team confirms fit, timing and pricing with you.",
  },
  {
    id: "retreat-deposit",
    slug: "retreat-deposit",
    name: "Retreat Deposit",
    type: "digital",
    priceCents: 0,
    tagline: "Hold your place at the next retreat",
    description: "Reserve a spot at an upcoming Mike Salemi retreat. The balance is due before the retreat starts.",
    bullets: ["Holds your place", "Applied to the full retreat price"],
    image: planImage,
    inquiry: { label: "Apply for a place", to: "/retreats" },
    note: "Application required — deposit details are shared once your place is confirmed.",
  },
];

export function findProduct(slug: string) {
  return shopProducts.find((p) => p.slug === slug) ?? null;
}

export function formatPrice(cents: number) {
  if (cents === 0) return "Included";
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function productPriceLabel(p: ShopProduct, cents = p.priceCents) {
  return p.inquiry ? "Application required" : formatPrice(cents);
}
