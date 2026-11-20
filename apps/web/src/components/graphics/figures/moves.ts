/** Movement definitions for the figures (re-exported for the preview and callers). */
export { MOVES, type MoveName } from "./library";
export type { MoveDef as Move } from "./rig";

import { MOVES as ALL, type MoveName as Name } from "./library";
/** Every movement, in display order. */
export const MOVE_NAMES = Object.keys(ALL) as Name[];
