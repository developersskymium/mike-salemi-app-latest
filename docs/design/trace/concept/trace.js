/* TRACE motion: drawn light. Paths expose over time with a hot head and a fading tail. */
(function () {
  const q = new URLSearchParams(location.search);
  const theme = q.get("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  const still = q.get("still") === "1";
  if (still) document.documentElement.classList.add("still");
  if (q.get("full") === "1") document.documentElement.classList.add("full");
  const NS = "http://www.w3.org/2000/svg";
  const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  /* A trace along any path: tapered tail (N segments rising in opacity and width), glow, dotted path ahead, head. */
  function trace(svg, d, o = {}) {
    const w = o.width || 3, N = o.segments || 30, target = o.progress ?? 1;
    const g = mk("g", { class: "trace" }); svg.appendChild(g);
    const ref = mk("path", { d, fill: "none" }); ref.style.visibility = "hidden"; g.appendChild(ref);
    const L = ref.getTotalLength();
    const pts = (a, b, step = 3) => { const out = []; for (let s = a; s < b; s += step) { const p = ref.getPointAtLength(s); out.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`); } const p = ref.getPointAtLength(b); out.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`); return out.join(" "); };
    const layer = mk("g"); g.appendChild(layer);
    function render(p) {
      layer.innerHTML = "";
      const done = L * p;
      if (o.ahead !== false && done < L) layer.appendChild(mk("polyline", { points: pts(done, L, 2), class: "ahead", "stroke-width": Math.max(1.4, w * .55) }));
      if (done > 0.5) {
        const tailStart = o.fullTail ? 0 : Math.max(0, done - L * (o.tail ?? 1));
        layer.appendChild(mk("polyline", { points: pts(Math.max(tailStart, done * .45), done), class: "glow", "stroke-width": w * 3.2 }));
        for (let i = 0; i < N; i++) {
          const a = tailStart + (done - tailStart) * i / N, b = tailStart + (done - tailStart) * (i + 1) / N + .6;
          const t = (i + 1) / N;
          layer.appendChild(mk("polyline", { points: pts(a, Math.min(b, done)), class: "tail", "stroke-width": (w * (.25 + .75 * t)).toFixed(2), "stroke-opacity": (o.floor ?? .08) + (1 - (o.floor ?? .08)) * Math.pow(t, 1.5), "stroke-linecap": i === N - 1 ? "round" : "butt" }));
        }
        if (o.head !== false) {
          const h = ref.getPointAtLength(done);
          layer.appendChild(mk("circle", { cx: h.x, cy: h.y, r: w * 3.2, class: "head-halo" }));
          layer.appendChild(mk("circle", { cx: h.x, cy: h.y, r: w * .95, class: "head" }));
        }
      }
      (o.nodes || []).forEach((f) => {
        const at = L * f, pt = ref.getPointAtLength(at), lit = at <= done + .5;
        layer.appendChild(mk("circle", { cx: pt.x, cy: pt.y, r: o.nodeR || w * 1.6, class: lit ? "node lit" : "node" }));
      });
      if (o.onFrame) o.onFrame(p, ref, L);
    }
    if (still || !o.animate) { render(target); return { ref, L }; }
    render(0);
    const t0 = performance.now() + (o.delay || 0), dur = o.dur || 1400;
    const tick = (now) => { const t = Math.min(1, Math.max(0, (now - t0) / dur)); render(target * ease(t)); if (t < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    return { ref, L };
  }

  /* Star trails: concentric arcs around the pole, as in a long exposure over the mountain. */
  function starTrails(svg, cx, cy, n, rmin, rmax) {
    const g = mk("g", { class: "stars" }); g.style.transformOrigin = `${cx}px ${cy}px`;
    for (let i = 0; i < n; i++) {
      const r = rmin + Math.pow(rnd(), .8) * (rmax - rmin), a0 = rnd() * Math.PI * 2, sweep = (.08 + rnd() * .22) * Math.PI;
      const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0), x2 = cx + r * Math.cos(a0 + sweep), y2 = cy + r * Math.sin(a0 + sweep);
      const big = rnd() > .93;
      g.appendChild(mk("path", { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`, fill: "none", stroke: big ? "#DDF4FF" : (rnd() > .5 ? "#9FD7F5" : "#C9D6E6"), "stroke-width": big ? 1.3 : .6 + rnd() * .5, "stroke-opacity": (big ? .85 : .18 + rnd() * .45).toFixed(2), "stroke-linecap": "round" }));
    }
    svg.appendChild(g); return g;
  }

  /* Glacier contours for daylight: the same mountain as a topo map. */
  function contours(svg, cx, cy, n, r0, step) {
    const g = mk("g", { class: "contours" });
    for (let i = 0; i < n; i++) {
      const r = r0 + i * step, ph = rnd() * 6, ph2 = rnd() * 6; let d = "";
      for (let k = 0; k <= 120; k++) {
        const th = k / 120 * Math.PI * 2;
        const rr = r * (1 + .08 * Math.sin(3 * th + ph) + .05 * Math.sin(5 * th + ph2) + .02 * i / n * Math.sin(9 * th));
        const x = cx + rr * Math.cos(th) * 1.5, y = cy + rr * Math.sin(th) * .8;
        d += (k ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      g.appendChild(mk("path", { d: d + "Z", fill: "none", stroke: "var(--lines)", "stroke-width": i % 5 === 0 ? 1 : .55, "stroke-opacity": i % 5 === 0 ? .55 : .3 }));
    }
    svg.appendChild(g); return g;
  }

  /* Numbers count up, stretching wide while moving (motion blur), then settle. */
  function tick(el) {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), dur = +(el.dataset.dur || 1100), delay = +(el.dataset.delay || 300);
    if (still) { el.textContent = to; return; }
    el.textContent = from; el.style.transition = "font-stretch .5s cubic-bezier(.16,1,.3,1), letter-spacing .5s";
    setTimeout(() => {
      el.style.fontStretch = "60%";
      const t0 = performance.now();
      const f = (now) => { const t = Math.min(1, (now - t0) / dur); el.textContent = Math.round(from + (to - from) * ease(t)); if (t < 1) requestAnimationFrame(f); else el.style.fontStretch = ""; };
      requestAnimationFrame(f);
    }, delay);
  }

  window.TRACE = { theme, still, trace, starTrails, contours, mk, rnd };
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-count]").forEach(tick);
    document.querySelectorAll(".press").forEach((b) => {
      b.addEventListener("pointerdown", () => b.classList.add("pressed"));
      ["pointerup", "pointerleave"].forEach((e) => b.addEventListener(e, () => b.classList.remove("pressed")));
    });
    if (!still) document.body.classList.add("enter");
  });
})();
