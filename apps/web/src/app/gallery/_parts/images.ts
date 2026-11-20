import breathwork from "../_img/breathwork.jpg";
import coaching from "../_img/coaching.jpg";
import deadlift from "../_img/deadlift.jpg";
import fire from "../_img/fire.jpg";
import getup from "../_img/getup.jpg";
import mtk from "../_img/mtk.jpg";
import press from "../_img/press.jpg";
import redgym from "../_img/redgym.jpg";
import shastaRidge from "../_img/shasta-ridge.jpg";
import soundRest from "../_img/sound-rest.jpg";
import squat from "../_img/squat.jpg";
import summit from "../_img/summit.jpg";
import wideStance from "../_img/wide-stance.jpg";

/** Mike's photography from the approved mockup, for the gallery only. */
export const IMG = { breathwork, coaching, deadlift, fire, getup, mtk, press, redgym, shastaRidge, soundRest, squat, summit, wideStance };

/** The bell's real path in each photo, in the photo's own pixels (for PhotoGrade traces). */
export const BELL_PATHS = {
  press: { d: "M150 480 C150 420 70 380 80 300 C88 230 110 200 102 150 C98 120 104 96 106 72", viewBox: "0 0 560 620" },
  mtk: { d: "M835 1010 C842 900 846 760 830 600", viewBox: "0 0 1600 1213" },
  redgym: { d: "M640 760 C600 620 700 470 780 340 C820 260 836 160 842 78", viewBox: "0 0 1426 797" },
} as const;
