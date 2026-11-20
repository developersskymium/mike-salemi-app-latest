import breathwork from "./breathwork.jpg";
import coaching from "./coaching.jpg";
import deadlift from "./deadlift.jpg";
import getup from "./getup.jpg";
import mtk from "./mtk.jpg";
import press from "./press.jpg";
import redgym from "./redgym.jpg";
import shastaRidge from "./shasta-ridge.jpg";
import soundRest from "./sound-rest.jpg";
import squat from "./squat.jpg";
import wideStance from "./wide-stance.jpg";

/** Mike's photography (from the approved Liquid mockup), keyed so loaders and fixtures can stay JSON. */
export const PHOTOS = {
  breathwork: { src: breathwork, alt: "Breathwork circle on the grass", position: "50% 40%" },
  coaching: { src: coaching, alt: "Mike coaching a kettlebell press", position: "46% 24%" },
  deadlift: { src: deadlift, alt: "Mike setting up a kettlebell deadlift", position: "50% 30%" },
  getup: { src: getup, alt: "Turkish get up with a kettlebell", position: "50% 30%" },
  mtk: { src: mtk, alt: "Mike in the gym with a kettlebell", position: "50% 30%" },
  press: { src: press, alt: "Single arm kettlebell press", position: "50% 25%" },
  redgym: { src: redgym, alt: "Kettlebell windmill in the gym", position: "40% 40%" },
  shastaRidge: { src: shastaRidge, alt: "Men of Movement on a ridge near Mount Shasta", position: "40% 50%" },
  soundRest: { src: soundRest, alt: "Sound rest after a session", position: "50% 40%" },
  squat: { src: squat, alt: "Kettlebell goblet squat", position: "50% 35%" },
  wideStance: { src: wideStance, alt: "Wide stance kettlebell hold", position: "50% 35%" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
