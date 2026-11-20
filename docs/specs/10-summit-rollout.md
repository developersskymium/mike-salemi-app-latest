# 10 — Summit rollout (approved direction) + client notes

Approved (Nov 20): Direction 3 "Summit" — docs/design/summit/ (index.html, *.html screens, shots/*.png, design-system sheet 08-design-system.png). Client: "the direction is somewhat better, it can be further polished, especially those scenes/illustrations." It REPLACES Trace entirely (Trace was rejected: "cyber software patch from the early 2000s", "washed out", "too much glass").

## Summit principles (from the approved screens)
1. Mike leads: full-colour, warm photos of Mike on every key screen; never tinted, graded or washed out.
2. Daylight: warm chalk ground, crisp white cards, three depth levels; strong contrast. Dark mode = warm ink, still photo-rich.
3. Glass only for small overlays (phone tab bar, video controls, photo badges).
4. Type: Archivo 800 for headlines and numbers, Inter for text. Nothing stretched.
5. Colour: glacier blue = "do this" (primary actions); ember/orange = progress, streaks, achievement; warm ink neutrals.
6. Signature: "The Climb" — a level drawn as a route up Mount Shasta, phases as camps, the member marked on it; illustrations in a flat daytime style (being polished by a dedicated illustrator agent — use components/graphics APIs; they will be upgraded in place).
7. One obvious next step per screen.
8. Smart, non-pushy growth: next programs appear as "beyond the summit" next steps tied to progress (Level II, Mastering the Kettlebell, retreats), contextual help that is also a cross-sell ("Struggling with the row? Mike's 6-min fix in MTK"), bundles/plan upgrades shown as value.
9. Original sidebar (legacy L0): resume card on top, Home, Programs, Retreats, Library, Schedule, Account; "Your access" list; "Additional" (Tools, Coaching, Referrals; Shop when enabled); member at the bottom with theme toggle. Phone: tab bar Home / Programs / Profile / More.
10. Original layouts per page (spec 08 §L) — Summit is the visual language on top.

## Client notes (verbatim intent, Nov 20)
- Give each program (MTK, A4L, Working-In, Path/Grounded King, free series…) a UNIQUE, signature way to go through it: navigation, styling, beautiful design, better and more intuitive categorisation, and progress management. KBL already has its signature way (days/phases/readiness/tables).
- Self-Guided must be more intuitive. Programs like KBL already have day/week plans — use that data to plan Self-Guided via a small multi-step wizard (pick level, days per week, start date, focus → a generated schedule). Other programs get their own properly planned self-guided paths.
- The app feels jerky when clicking — make it smooth and fast (instant feedback, prefetching, skeletons via loading.tsx, optimistic UI, no blocking waterfalls, view transitions, cached catalog data).
- Card covers must NOT use images that have text baked in; images must not be cut off (right aspect ratios, focal points, contain where needed).
- Retreats: visually heavy, Airbnb-inspired, immersive gallery. 3-step sign-up: Apply → Schedule a call → if approved, Pay. Then a countdown + preparation list while waiting. While the retreat is live: itinerary, gallery, help.
- Coaching: a full coaching experience, more intuitive.
- Shop: proper, complete UX/UI.

## Business facts from the client's notes (use as data/copy; mark unconfirmed with draft_note)
- Men of Movement retreats: two programs — "Hold Your Ground" and "Primal Reset" (slightly different venues and focus). Application required (almost everyone accepted), a call is involved. Price ~$2,700; regular $3,100–$3,250 (draft).
- Men of Movement pre-retreat program: 6 videos, free and included with a retreat, access opens ~3 months before the retreat; 5 pillars: Men of Rotation(?), Movement, Breathwork, Nature, Storywork; a post-retreat module unlocks after the retreat; lifetime access for now.
- Kettlebell Roadmap: lead magnet, needs a more result-oriented title; may become an AI tool (PDF → tool).
- MTK: intake questionnaire (who they are, level, time).
- "Get started with the 4 fundamental lifts" (beginner) — free lead magnet; title to improve. "Kettlebell Strength" beginner free program (demonstrations only) — lead magnet.
- Athleticism 4 Life: $249, as it is, heavily branded.
- Working-In (Paul Chek & Mike): short program, 8–15 short videos; Mike may add a series.
- What Your Kettlebell Swing Is Missing / Free 6-Video Mini Series: small programs that may turn into tools (the 6-video series is for trainers); a 9-video mini premium program ($50–100) exists on Vimeo.
- Future: KBL Plus (strength + myofascial follow-up to KBL).
- Partner/affiliate program (e.g. a firefighter program hosted on Thinkific) at 50/50 commission.
- Podcast "King Within". Group coaching "The Grounded King" (may stop in November; The Path to Inspired Action became it); the Zen Savage challenge replaces group coaching.
- 1:1 coaching: mostly men, women possible; physical performance and inner work; main slot 45 min on Tuesdays. Executive Edge: 8 weeks / 60 days, $4,500–$5,000, 3–4 interactions with Mike, daily 5-minute homework (highest-priority one thing), mental focus / energy / antifragility.
- Prices for all programs will be revised (first-time buyer pricing and upsell pricing) — keep prices as drafts.
