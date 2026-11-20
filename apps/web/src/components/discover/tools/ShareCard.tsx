"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Sheet, useToast } from "@/components/ui";
import type { ToolResultView } from "./defs";

const W = 1080;
const H = 1350;

/** Summit palette for the exported card (fixed: an image is the same in light and dark). */
const C = {
  chalk: "#F6F7F9", ink: "#0E1B2C", ink2: "#435063", ink3: "#717C8B", glacier: "#1A85D6", glacierInk: "#135690", ember: "#F2632A",
  sky1: "#E3F0FB", sky2: "#F1F6FB", sun: "#FF7F3F", mtn: "#9CC6EA", mtnFar: "#C6DDF2", snow: "#FFFFFF", ground: "#EEF3F8", line: "#E6E9ED", ok: "#1F9D6A", amber: "#E8A53C", red: "#D9483B",
};

function fonts() {
  const probe = document.querySelector("h1") ?? document.body;
  const display = getComputedStyle(probe).fontFamily || "'Instrument Sans', Arial, sans-serif";
  const text = getComputedStyle(document.body).fontFamily || "'Instrument Sans', Arial, sans-serif";
  return { display, text };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines: number) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = `${out[lines - 1]!.replace(/[\s,.;:]+\S*$/, "")}…`;
  }
  return out;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bell(ctx: CanvasRenderingContext2D, cx: number, base: number, size: number, label: string, f: string, fill: string) {
  const r = size / 2;
  const cy = base - r;
  ctx.lineWidth = size * 0.11;
  ctx.strokeStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.78, r * 0.62, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(size * 0.34)}px ${f}`;
  ctx.fillText(label, cx, cy + size * 0.12);
}

/** Draws the shareable result card (1080×1350, 4:5) and resolves a PNG blob. */
export async function drawResultCard(r: ToolResultView, tool: string, name?: string | null): Promise<Blob | null> {
  await document.fonts.ready;
  const { display, text } = fonts();
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;

  // ground + sky scene (Summit daylight)
  ctx.fillStyle = C.chalk;
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, 560);
  sky.addColorStop(0, C.sky1);
  sky.addColorStop(1, C.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 560);
  ctx.fillStyle = "rgba(255,127,63,.18)";
  ctx.beginPath();
  ctx.arc(850, 190, 104, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.sun;
  ctx.beginPath();
  ctx.arc(850, 190, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.mtnFar;
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.bezierCurveTo(200, 420, 360, 380, 520, 400);
  ctx.bezierCurveTo(700, 420, 880, 380, 1080, 410);
  ctx.lineTo(1080, 560);
  ctx.lineTo(0, 560);
  ctx.fill();
  ctx.fillStyle = C.mtn;
  ctx.beginPath();
  ctx.moveTo(80, 560);
  ctx.bezierCurveTo(260, 480, 400, 330, 500, 250);
  ctx.bezierCurveTo(530, 226, 560, 222, 590, 244);
  ctx.bezierCurveTo(700, 330, 860, 470, 1040, 560);
  ctx.fill();
  ctx.fillStyle = C.snow;
  ctx.beginPath();
  ctx.moveTo(492, 258);
  ctx.bezierCurveTo(520, 232, 548, 222, 576, 234);
  ctx.bezierCurveTo(598, 248, 612, 262, 622, 272);
  ctx.bezierCurveTo(596, 270, 584, 290, 566, 280);
  ctx.bezierCurveTo(548, 296, 532, 278, 512, 288);
  ctx.bezierCurveTo(504, 280, 498, 270, 492, 258);
  ctx.fill();
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 540, W, 40);

  // brand
  ctx.fillStyle = C.ink;
  rr(ctx, 72, 72, 64, 64, 18);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(104, 108, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(104, 94, 9, Math.PI, 0);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `600 30px ${display}`;
  ctx.fillText("MIKE SALEMI", 156, 102);
  ctx.fillStyle = C.ink2;
  ctx.font = `600 20px ${text}`;
  ctx.fillText("KETTLEBELL · MOVEMENT", 157, 130);

  // the card
  const cx = 64;
  const cy = 430;
  const cw = W - 128;
  const ch = 800;
  ctx.save();
  ctx.shadowColor = "rgba(14,27,44,.14)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#fff";
  rr(ctx, cx, cy, cw, ch, 48);
  ctx.fill();
  ctx.restore();

  const px = cx + 64;
  let y = cy + 92;
  ctx.fillStyle = C.glacierInk;
  ctx.font = `700 24px ${text}`;
  ctx.fillText(`${tool.toUpperCase()} · MY RESULT`, px, y);
  y += 30;
  ctx.fillStyle = C.ink;
  ctx.font = `600 76px ${display}`;
  for (const l of wrap(ctx, r.headline, cw - 128, 2)) {
    y += 82;
    ctx.fillText(l, px, y);
  }
  ctx.fillStyle = C.ink2;
  ctx.font = `400 32px ${text}`;
  y += 22;
  for (const l of wrap(ctx, r.summary, cw - 128, 3)) {
    y += 46;
    ctx.fillText(l, px, y);
  }

  // the metric
  const top = Math.max(y + 60, cy + 470);
  const bottom = cy + ch - 70;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, top - 30);
  ctx.lineTo(cx + cw - 64, top - 30);
  ctx.stroke();
  if (r.kind === "selector") {
    const max = Math.max(...r.bells.map((b) => b.size));
    r.bells.forEach((b, i) => {
      const s = 96 + (b.size / max) * 70;
      bell(ctx, px + 110 + i * 250, bottom - 20, s, b.label, display, i === 0 ? C.glacier : C.ink);
      ctx.fillStyle = C.ink3;
      ctx.font = `600 22px ${text}`;
      ctx.textAlign = "center";
      ctx.fillText(["FIRST BELL", "WORKING", "HEAVY"][i] ?? "", px + 110 + i * 250, bottom + 22);
    });
    ctx.textAlign = "left";
  } else if (r.kind === "stretch" || r.kind === "readiness") {
    const pct = r.max ? r.score / r.max : 0;
    ctx.fillStyle = C.ink;
    ctx.font = `600 120px ${display}`;
    ctx.fillText(String(r.score), px, bottom - 20);
    const wNum = ctx.measureText(String(r.score)).width;
    ctx.fillStyle = C.ink3;
    ctx.font = `600 44px ${display}`;
    ctx.fillText(`/${r.max}`, px + wNum + 8, bottom - 20);
    ctx.font = `600 22px ${text}`;
    ctx.fillText(r.kind === "stretch" ? "MOBILITY SCORE" : "READINESS SCORE · LOWER IS FRESHER", px, bottom + 22);
    const bx = px + 360;
    const bw = cw - 128 - 360;
    ctx.fillStyle = "#F0F2F5";
    rr(ctx, bx, bottom - 64, bw, 26, 13);
    ctx.fill();
    const tone = r.kind === "readiness" ? (r.band === "green" ? C.ok : r.band === "amber" ? C.amber : C.red) : C.ember;
    ctx.fillStyle = tone;
    rr(ctx, bx, bottom - 64, Math.max(26, bw * pct), 26, 13);
    ctx.fill();
  } else {
    const n = r.phases.length;
    const gap = (cw - 128 - 40) / Math.max(1, n - 1);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 6;
    ctx.setLineDash([2, 14]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px + 20, bottom - 60);
    ctx.lineTo(px + 20 + gap * (n - 1), bottom - 60);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = C.ember;
    ctx.beginPath();
    ctx.moveTo(px + 20, bottom - 60);
    ctx.lineTo(px + 20 + gap * r.phase, bottom - 60);
    ctx.stroke();
    r.phases.forEach((p, i) => {
      const x = px + 20 + gap * i;
      ctx.fillStyle = i <= r.phase ? C.ember : "#fff";
      ctx.strokeStyle = i <= r.phase ? C.ember : C.line;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, bottom - 60, i === r.phase ? 22 : 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i === r.phase ? C.ink : C.ink3;
      ctx.font = `${i === r.phase ? 700 : 600} 22px ${text}`;
      ctx.textAlign = i === 0 ? "left" : i === n - 1 ? "right" : "center";
      ctx.fillText(p.label, i === 0 ? x - 16 : i === n - 1 ? x + 16 : x, bottom);
    });
    ctx.textAlign = "left";
  }

  // footer
  ctx.fillStyle = C.ink2;
  ctx.font = `600 24px ${text}`;
  ctx.fillText(name ? `${name} · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), 72, H - 56);
  ctx.textAlign = "right";
  ctx.fillStyle = C.glacierInk;
  ctx.font = `700 24px ${text}`;
  ctx.fillText("Train with Mike · Free tools", W - 72, H - 56);

  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

/** "Share result card": draws the card, previews it, then shares the image (Web Share) or downloads it. */
export function ShareResult({ result, tool, slug }: { result: ToolResultView; tool: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const toast = useToast();

  const make = useCallback(async () => {
    setOpen(true);
    const b = await drawResultCard(result, tool);
    if (!b) return;
    setBlob(b);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(b);
    });
  }, [result, tool]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const file = blob ? new File([blob], `${slug}-result.png`, { type: "image/png" }) : null;
  const canShare = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `${tool}: ${result.headline}`, text: `My ${tool} result: ${result.headline}` });
    } catch {
      /* cancelled */
    }
  };
  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-result.png`;
    a.click();
    toast("Result card saved", { tone: "success", icon: "download" });
  };

  return (
    <>
      <Button variant="secondary" size="md" icon="share" onClick={make}>Share result card</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your result card"
        description="Made for stories and messages. Nothing is posted until you share it."
        footer={
          <div className="w1-share-actions">
            {canShare && <Button block icon="share" onClick={share}>Share</Button>}
            <Button block variant={canShare ? "secondary" : "filled"} icon="download" onClick={download} disabled={!url}>Save image</Button>
          </div>
        }
      >
        <div className="w1-share-preview">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${tool} result card: ${result.headline}`} width={W} height={H} />
          ) : (
            <span className="w1-share-wait lq-t13 lq-c2">Drawing your card…</span>
          )}
        </div>
      </Sheet>
    </>
  );
}
