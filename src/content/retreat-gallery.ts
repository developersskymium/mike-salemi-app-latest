/**
 * Retreat photography from Mike Salemi's live retreat pages (mikesalemi.io/retreats),
 * stored as project assets so the app doesn't depend on external hotlinks.
 */

import circleRoom from "@/assets/retreat/live/breakthrough-circle-room.jpg.asset.json";
import venue from "@/assets/retreat/live/breakthrough-venue.jpg.asset.json";
import breathwork from "@/assets/retreat/live/breathwork.jpg.asset.json";
import qiGong from "@/assets/retreat/live/qi-gong.png.asset.json";
import fire from "@/assets/retreat/live/fire.jpg.asset.json";
import timsLand from "@/assets/retreat/live/tims-land.jpg.asset.json";
import maloca from "@/assets/retreat/live/maloca.jpg.asset.json";
import afterLodge from "@/assets/retreat/live/after-sweat-lodge.jpg.asset.json";
import meals from "@/assets/retreat/live/shared-meals.png.asset.json";
import groupLand from "@/assets/retreat/live/group-tims-land.jpg.asset.json";
import facingShasta from "@/assets/retreat/live/facing-shasta.png.asset.json";
import summitClouds from "@/assets/retreat/online/summit-clouds.jpg.asset.json";
import campfire from "@/assets/retreat/online/campfire-men.jpg.asset.json";
import forestPath from "@/assets/retreat/online/forest-path.jpg.asset.json";
import alpinePines from "@/assets/retreat/online/alpine-pines.jpg.asset.json";
import mistyRidge from "@/assets/retreat/online/misty-ridge.jpg.asset.json";
import foggyForest from "@/assets/retreat/online/foggy-forest.jpg.asset.json";
import sunriseCamp from "@/assets/retreat/online/sunrise-camp.jpg.asset.json";

export type RetreatPhoto = { src: string; caption: string };

/** Captions are the alt text Mike's site uses for each photo. */
export const retreatGallery: RetreatPhoto[] = [
  { src: circleRoom.url, caption: "The sacred circle room at The Breakthrough" },
  { src: venue.url, caption: "The Breakthrough venue at golden hour" },
  { src: qiGong.url, caption: "Qi Gong on Mount Shasta" },
  { src: breathwork.url, caption: "Breathwork ceremony" },
  { src: fire.url, caption: "Men around the fire" },
  { src: timsLand.url, caption: "Men walking through Tim's land" },
  { src: maloca.url, caption: "Inside the maloca, Tim's land" },
  { src: afterLodge.url, caption: "Brotherhood after the sweat lodge" },
  { src: meals.url, caption: "Shared meals and brotherhood" },
  { src: groupLand.url, caption: "Men of Movement group on Tim's land" },
  { src: facingShasta.url, caption: "One man facing Mount Shasta" },
];

/** Supporting landscape photography (Unsplash), used to round out the gallery. */
export const retreatLandscapes: RetreatPhoto[] = [
  { src: summitClouds.url, caption: "Peaks above the clouds at first light" },
  { src: campfire.url, caption: "An evening around the fire" },
  { src: forestPath.url, caption: "Forest trail through old-growth pines" },
  { src: alpinePines.url, caption: "Alpine valley and pine forest" },
  { src: mistyRidge.url, caption: "Mist lifting off the ridge" },
  { src: foggyForest.url, caption: "Morning fog in the forest" },
  { src: sunriseCamp.url, caption: "Sunrise over the mountain camp" },
];

/** Mike's own photos first, landscapes after. */
export const retreatFullGallery: RetreatPhoto[] = [...retreatGallery, ...retreatLandscapes];

export const retreatCovers = {
  breakthrough: circleRoom.url,
  primalReset: timsLand.url,
  fire: fire.url,
  shasta: facingShasta.url,
};
