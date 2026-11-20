/**
 * The kettlebell, front view, shared by every graphic. A round body wider
 * than it is tall on a flat base, horns flaring into a wide, round handle
 * and a clear window, so it can never read as a padlock. Origin at the centre
 * of the handle's top bar, body towards +y. Bounds: x ±12.6, y -2.2 to 29.8.
 */
export const BELL_OUTLINE =
  "M-6.8 30.6A12.6 11.4 0 0 1-11.2 15.8C-12.4 10-12.2 3.4-10 1C-8.8-.6-7.6-1.6-5.6-1.8H5.6C7.6-1.6 8.8-.6 10 1C12.2 3.4 12.4 10 11.2 15.8A12.6 11.4 0 0 1 6.8 30.6Z";
export const BELL_WINDOW =
  "M-8.4 12.5C-9 8-8.8 4.8-7.2 3.2C-6.2 2.2-5 1.6-3.8 1.6H3.8C5 1.6 6.2 2.2 7.2 3.2C8.8 4.8 9 8 8.4 12.5A12.6 11.4 0 0 0-8.4 12.5Z";
/** Specular sweep on the body's upper left. */
export const BELL_SPEC = "M-8.8 19.4A10.6 9.6 0 0 1-.8 12.8";
/** Light along the top of the handle. */
export const BELL_SHEEN = "M-4.8-.2H4.8";
/** Centre of the body (handle-top origin). */
export const BELL_BODY_CENTRE = 21;
export const BELL_TOP = -1.8;
export const BELL_BASE = 30.6;
