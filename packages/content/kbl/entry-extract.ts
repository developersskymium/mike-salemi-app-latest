// Bundled by bundle-run.mjs against the legacy source; prints one JSON document to stdout.
import { courses } from "@/content/program";
import { KBL_FORMS, daysWithForms } from "@/content/kbl-forms";
import { WORKOUT_TABLES } from "@/content/readiness-table";
import { libraryVideos, libraryLevels, libraryCategories, libraryTags } from "@/content/library";
import { planDownloads } from "@/content/plans";
import { badges } from "@/content/badges";
import { kettlebellSelectorMeta, selectorSteps, resolveKettlebell, weightThreshold } from "@/content/kettlebell-selector";
import { stretchTest } from "@/content/tools";
import starter from "@/content/starter-workout-tables.json";

const genders = ["male", "female"] as const;
const bw = ["below", "above"] as const;
const lv = ["beginner", "intermediate"] as const;
const fit = ["low", "medium-high"] as const;
const scenarios: unknown[] = [];
for (const gender of genders) for (const bodyweight of bw) for (const level of lv) for (const fitness of fit) {
  const r = resolveKettlebell({ gender, bodyweight, level, fitness });
  scenarios.push({ answers: { gender, bodyweight, level, fitness }, ...r });
}
const questions = selectorSteps.map((s) => ({
  id: s.id, eyebrow: s.eyebrow, question: s.question, help: s.help,
  options: s.options({ gender: "male" }),
  options_by_gender: s.id === "bodyweight" ? { male: s.options({ gender: "male" }), female: s.options({ gender: "female" }) } : undefined,
}));
const out = {
  forms: KBL_FORMS,
  dayForms: daysWithForms(),
  tables: WORKOUT_TABLES,
  starterIds: Object.keys(starter),
  library: { videos: libraryVideos, levels: libraryLevels, categories: libraryCategories, tags: libraryTags },
  plans: planDownloads,
  badges,
  selector: { meta: kettlebellSelectorMeta, thresholds: { male: weightThreshold("male"), female: weightThreshold("female") }, questions, scenarios },
  stretchTest,
  courseMeta: courses.map((c) => ({ id: c.id, slug: c.slug, level: c.level, title: c.title, tagline: c.tagline, image: c.image, description: c.description, outcomes: c.outcomes, format: c.format, whatsNeeded: c.whatsNeeded, heroVimeoId: c.heroVimeoId })),
};
console.log(JSON.stringify(out));
