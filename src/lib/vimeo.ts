/**
 * Vimeo helpers.
 *
 * Poster frames come from vumbnail.com, which resolves a Vimeo video id to its
 * public poster image without needing an API token. If a poster fails to load
 * the UI falls back to a deterministic gradient (see <Poster />).
 */

/** Accepts "123456789" or the unlisted "123456789/privacyhash" form. */
export function splitVimeoId(vimeoId: string) {
  const [id, hash] = vimeoId.split("/");
  return { id, hash };
}

/**
 * vumbnail.com cannot see the unlisted / domain-restricted videos in this
 * catalogue: it silently serves a black padlock frame for them. Posters are
 * resolved through Vimeo's own oEmbed endpoint instead (see lib/vimeo-meta),
 * and anything without a real frame falls back to a designed colour block.
 */
export const REMOTE_POSTERS_ENABLED = false;

export function vimeoPoster(vimeoId: string, size: "sm" | "md" | "lg" = "md") {
  if (!REMOTE_POSTERS_ENABLED) return "";
  const suffix = size === "lg" ? "_large" : size === "sm" ? "_small" : "";
  return `https://vumbnail.com/${splitVimeoId(vimeoId).id}${suffix}.jpg`;
}


export function vimeoEmbed(vimeoId: string, autoplay = false) {
  const { id, hash } = splitVimeoId(vimeoId);
  // `api=1` enables the postMessage player API used for resume points.
  return `https://player.vimeo.com/video/${id}?api=1&dnt=1&title=0&byline=0&portrait=0${
    hash ? `&h=${hash}` : ""
  }${autoplay ? "&autoplay=1" : ""}`;
}

/**
 * Embed URL with Vimeo's own chrome switched off — the app draws its own
 * iOS-style controls on top and drives playback over postMessage.
 */
export function vimeoEmbedBare(vimeoId: string, autoplay = false) {
  const { id, hash } = splitVimeoId(vimeoId);
  return `https://player.vimeo.com/video/${id}?api=1&dnt=1&controls=0&title=0&byline=0&portrait=0&playsinline=1&transparent=0${
    hash ? `&h=${hash}` : ""
  }${autoplay ? "&autoplay=1&muted=0" : ""}`;
}


/** Stable 0-360 hue offset per id, used for the no-poster fallback. */
export function idHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
