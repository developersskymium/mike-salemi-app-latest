/**
 * Real Kettlebell Lifestyle session pool (private.sg_pool for the test member, step ids shortened to
 * their first 8 characters) and what the database's private.sg_assemble returned for each seed,
 * time budget and intent (w = warm-up, m = main, s = stretch). Captured 2026-11-20.
 */
import type { PoolItem, StepRole } from "../selfguided";

const raw = `4039765d warmup 10|a52f3b4a workout 26|01b0afa7 mobility 9|9f33846f warmup 10|ffdb623d recovery 6|07f93281 recovery 6|19c6001f warmup 6|6bba0cce mobility 9|cd9984d3 warmup 10|e7ee3146 warmup 6|d85bac69 workout 26|c6829b06 warmup 6|6628030e workout 26|bc366cdf warmup 6|2f58f6e0 warmup 6|01bc8afb warmup 10|965b1900 warmup 6|8ed461dc workout 26|f8845d07 recovery 6|aeb97121 warmup 6|c69c122b workout 26|dac20017 warmup 6|a9588420 workout 26|6a5f7aba skill 14|59b66e43 warmup 10|3502413c warmup 6|2a45e528 workout 26|11cb3095 recovery 6|9d644ee5 warmup 6|d5529cc4 workout 26|3d786a32 warmup 10|3347188c skill 14|547beabf warmup 10|4d4fcc43 skill 14|62913e64 workout 26|0ab99602 warmup 6|d5b91d17 skill 14|8e2c3fd7 skill 14|8bbda9c4 skill 14|5d673641 skill 14`;

export const KBL_POOL: PoolItem[] = raw.split("|").map((s) => {
  const [stepId, role, minutes] = s.split(" ");
  return { stepId: stepId!, lessonId: `l-${stepId}`, role: role as StepRole, minutes: Number(minutes), title: role! };
});

/** "seed minutes intent(s)" → "id:slot …" ("*" = every intent). */
export const KBL_CASES: Record<string, string> = {
  "0 10 *": "19c6001f:w ffdb623d:m",
  "0 20 workout": "19c6001f:w 6a5f7aba:m",
  "0 20 recovery": "19c6001f:w ffdb623d:m 07f93281:m",
  "0 20 skill": "19c6001f:w 6a5f7aba:m",
  "0 20 mobility": "19c6001f:w 01b0afa7:m ffdb623d:m",
  "0 30 workout": "4039765d:w 6a5f7aba:m ffdb623d:s",
  "0 30 recovery": "4039765d:w ffdb623d:m 07f93281:m 11cb3095:s",
  "0 30 skill": "4039765d:w 6a5f7aba:m ffdb623d:s",
  "0 30 mobility": "4039765d:w 01b0afa7:m ffdb623d:m 11cb3095:s",
  "0 45 workout": "4039765d:w a52f3b4a:m ffdb623d:s",
  "0 45 recovery": "4039765d:w ffdb623d:m 07f93281:m f8845d07:m 01b0afa7:m 11cb3095:s",
  "0 45 skill": "4039765d:w 6a5f7aba:m 3347188c:m ffdb623d:s",
  "0 45 mobility": "4039765d:w 01b0afa7:m 6bba0cce:m ffdb623d:m 07f93281:m 11cb3095:s",
  "1 10 *": "e7ee3146:w 11cb3095:m",
  "1 20 workout": "e7ee3146:w d5b91d17:m",
  "1 20 recovery": "e7ee3146:w 11cb3095:m ffdb623d:m",
  "1 20 skill": "e7ee3146:w d5b91d17:m",
  "1 20 mobility": "e7ee3146:w 6bba0cce:m 11cb3095:m",
  "1 30 workout": "cd9984d3:w d5b91d17:m 11cb3095:s",
  "1 30 recovery": "cd9984d3:w 11cb3095:m ffdb623d:m f8845d07:s",
  "1 30 skill": "cd9984d3:w d5b91d17:m 11cb3095:s",
  "1 30 mobility": "cd9984d3:w 6bba0cce:m 11cb3095:m f8845d07:s",
  "1 45 workout": "cd9984d3:w 8ed461dc:m 11cb3095:s",
  "1 45 recovery": "cd9984d3:w 11cb3095:m ffdb623d:m 07f93281:m 6bba0cce:m f8845d07:s",
  "1 45 skill": "cd9984d3:w d5b91d17:m 8e2c3fd7:m 11cb3095:s",
  "1 45 mobility": "cd9984d3:w 6bba0cce:m 01b0afa7:m 11cb3095:m ffdb623d:m f8845d07:s",
  "2 10 *": "bc366cdf:w f8845d07:m",
  "2 20 workout": "bc366cdf:w 5d673641:m",
  "2 20 recovery": "bc366cdf:w f8845d07:m 11cb3095:m",
  "2 20 skill": "bc366cdf:w 5d673641:m",
  "2 20 mobility": "bc366cdf:w 01b0afa7:m f8845d07:m",
  "2 30 workout": "bc366cdf:w 5d673641:m f8845d07:s",
  "2 30 recovery": "bc366cdf:w f8845d07:m 11cb3095:m ffdb623d:m 07f93281:s",
  "2 30 skill": "bc366cdf:w 5d673641:m f8845d07:s",
  "2 30 mobility": "bc366cdf:w 01b0afa7:m 6bba0cce:m 07f93281:s",
  "2 45 workout": "bc366cdf:w 2a45e528:m f8845d07:s",
  "2 45 recovery": "bc366cdf:w f8845d07:m 11cb3095:m ffdb623d:m 01b0afa7:m 07f93281:s",
  "2 45 skill": "bc366cdf:w 5d673641:m 6a5f7aba:m f8845d07:s",
  "2 45 mobility": "bc366cdf:w 01b0afa7:m 6bba0cce:m f8845d07:m 11cb3095:m 07f93281:s",
  "3 10 *": "965b1900:w 07f93281:m",
  "3 20 workout": "965b1900:w 4d4fcc43:m",
  "3 20 recovery": "965b1900:w 07f93281:m f8845d07:m",
  "3 20 skill": "965b1900:w 4d4fcc43:m",
  "3 20 mobility": "965b1900:w 6bba0cce:m 07f93281:m",
  "3 30 workout": "965b1900:w 4d4fcc43:m 07f93281:s",
  "3 30 recovery": "965b1900:w 07f93281:m f8845d07:m 11cb3095:m ffdb623d:s",
  "3 30 skill": "965b1900:w 4d4fcc43:m 07f93281:s",
  "3 30 mobility": "965b1900:w 6bba0cce:m 01b0afa7:m ffdb623d:s",
  "3 45 workout": "965b1900:w a52f3b4a:m 07f93281:s",
  "3 45 recovery": "965b1900:w 07f93281:m f8845d07:m 11cb3095:m 6bba0cce:m ffdb623d:s",
  "3 45 skill": "965b1900:w 4d4fcc43:m d5b91d17:m 07f93281:s",
  "3 45 mobility": "965b1900:w 6bba0cce:m 01b0afa7:m 07f93281:m f8845d07:m ffdb623d:s",
  "4 10 *": "3502413c:w ffdb623d:m",
  "4 20 workout": "3502413c:w 8bbda9c4:m",
  "4 20 recovery": "3502413c:w ffdb623d:m 07f93281:m",
  "4 20 skill": "3502413c:w 8bbda9c4:m",
  "4 20 mobility": "3502413c:w 01b0afa7:m ffdb623d:m",
  "4 30 workout": "59b66e43:w 8bbda9c4:m ffdb623d:s",
  "4 30 recovery": "59b66e43:w ffdb623d:m 07f93281:m 11cb3095:s",
  "4 30 skill": "59b66e43:w 8bbda9c4:m ffdb623d:s",
  "4 30 mobility": "59b66e43:w 01b0afa7:m ffdb623d:m 11cb3095:s",
  "4 45 workout": "59b66e43:w 8ed461dc:m ffdb623d:s",
  "4 45 recovery": "59b66e43:w ffdb623d:m 07f93281:m f8845d07:m 01b0afa7:m 11cb3095:s",
  "4 45 skill": "59b66e43:w 8bbda9c4:m 5d673641:m ffdb623d:s",
  "4 45 mobility": "59b66e43:w 01b0afa7:m 6bba0cce:m ffdb623d:m 07f93281:m 11cb3095:s",
};
