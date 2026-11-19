<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Database-backed program experiences share the imported program hierarchy and route through one course viewer, so future imports inherit navigation, intake, and progress behavior.
- Program-specific intake definitions and responses remain separate from the general onboarding intake, because they serve different decisions and lifecycles.
- AI self-guided plans may reference only published lessons returned by authenticated course reads, preventing invented or inaccessible training content.
- Demo-only offers and unconfirmed commercial details must be visibly labeled Preview or Draft and must never simulate a completed purchase.
- The member calendar combines core KBL days and AI-created sessions at the presentation layer so both scheduling systems remain compatible.
- Keep the shared shell light-first and token-driven, with translucent surfaces and one reusable rail treatment so visual refinements propagate across member pages.
- Site-wide copy, announcement bar and program merchandising (badge, offer, catalog group, featured, CTA) are admin-edited: settings live in the site_settings table and program extras in programs.meta, so pages read them instead of hardcoding.
- Global Library reads library_videos through an access-aware server function; filters use namespaced tags (level:, category:, topic:, kbl-day:, program:) in tags/library_video_tags, and program:-tagged videos only show to members with access to that program — so Library can never bypass program access.
- MTK personalization never locks or copies content: lesson metadata is generated once into a static classification file, a deterministic engine selects real lesson IDs in curriculum order, AI only writes the result summary (once per assessment attempt, cached in intake guidance), and plans reuse self_guided_plans (inputs.kind = "mtk", hidden from Self-Guided lists) with older versions archived — so cost stays flat and progress stays in program_lesson_progress.
- Program intake history is kept inside the response row's guidance JSON (current attempt at top level, all attempts in history); retakes clear current answers but never delete past attempts.
- Retreat cohorts are fixed by admins: dates/status/capacity live in site_settings key "retreats" layered over src/content/retreats.ts, and members only submit applications (retreat_applications) — so no member can customize dates or itinerary.
