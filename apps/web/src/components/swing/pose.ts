"use client";

import type { Pose } from "@ms/core";

/**
 * On-device pose detection (MediaPipe PoseLandmarker, lite model). Lazy-loaded the first time the
 * camera check opens: the library is a separate chunk, the WASM runtime comes from jsDelivr (pinned
 * to the installed version) and the model from Google's model CDN. Frames never leave the phone.
 */
const VERSION = "1.2.3"; // keep equal to apps/web/package.json @mediapipe/tasks-vision
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDetector {
  detect(video: HTMLVideoElement, t: number): Pose | null;
  close(): void;
}

let pending: Promise<PoseDetector> | null = null;

export function loadPoseDetector(): Promise<PoseDetector> {
  if (pending) return pending;
  pending = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    const make = (delegate: "GPU" | "CPU") =>
      PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    const lm = await make("GPU").catch(() => make("CPU"));
    let last = -1;
    return {
      detect(video, t) {
        if (video.readyState < 2) return null;
        const ts = Math.max(t, last + 1);
        last = ts;
        const r = lm.detectForVideo(video, ts);
        const p = r.landmarks?.[0];
        return p ? p.map((q) => ({ x: q.x, y: q.y, z: q.z, visibility: q.visibility ?? 0 })) : null;
      },
      close() {
        lm.close();
        pending = null;
      },
    };
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}
