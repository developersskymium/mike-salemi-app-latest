import { useEffect, useState } from "react";
import {
  fetchFirstVimeoMeta,
  peekVimeoMeta,
  type VimeoMeta,
} from "@/lib/vimeo-meta";

/**
 * Resolves the first candidate video that has a real poster frame.
 * Returns cached metadata synchronously on repeat renders, so tiles do not
 * flash when navigating back to a list.
 */
export function useVimeoMeta(candidates: string[]) {
  const key = candidates.join("|");
  const [meta, setMeta] = useState<VimeoMeta | null>(() => {
    for (const id of candidates) {
      const cached = peekVimeoMeta(id);
      if (cached) return cached;
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    const list = key ? key.split("|") : [];
    for (const id of list) {
      const cached = peekVimeoMeta(id);
      if (cached) {
        setMeta(cached);
        return;
      }
    }
    void fetchFirstVimeoMeta(list).then((result) => {
      if (active) setMeta(result);
    });
    return () => {
      active = false;
    };
  }, [key]);

  return meta;
}
