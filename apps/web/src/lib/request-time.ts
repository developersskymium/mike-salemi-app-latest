/** The request's time, for server components (they render once per request, so it is stable for the page). */
export function requestTime(): number {
  return Date.now();
}
