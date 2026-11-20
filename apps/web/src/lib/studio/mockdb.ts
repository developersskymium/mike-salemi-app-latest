import "server-only";

/**
 * A tiny read-only stand-in for the Supabase query builder, backed by the JSON fixture
 * (apps/web/fixtures/studio-db.json, real rows). Supports the subset the studio loaders use.
 * Only used in local mock preview.
 */
type Row = Record<string, unknown>;
type Res = { data: unknown; error: null | { message: string }; count?: number | null };

class Q implements PromiseLike<Res> {
  private f: Array<(r: Row) => boolean> = [];
  private ord: Array<[string, boolean]> = [];
  private lim: number | null = null;
  private from = 0;
  private head = false;
  private count = false;
  private one: "single" | "maybe" | null = null;
  constructor(private rows: Row[]) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.count = true;
    if (opts?.head) this.head = true;
    return this;
  }
  eq(c: string, v: unknown) { this.f.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.f.push((r) => r[c] !== v); return this; }
  is(c: string, v: unknown) { this.f.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  in(c: string, v: unknown[]) { this.f.push((r) => v.includes(r[c])); return this; }
  gte(c: string, v: string | number) { this.f.push((r) => String(r[c] ?? "") >= String(v)); return this; }
  lte(c: string, v: string | number) { this.f.push((r) => String(r[c] ?? "") <= String(v)); return this; }
  ilike(c: string, p: string) { const s = p.replace(/%/g, "").toLowerCase(); this.f.push((r) => String(r[c] ?? "").toLowerCase().includes(s)); return this; }
  or(expr: string) {
    const parts = expr.split(",").map((x) => x.split("."));
    this.f.push((r) => parts.some(([c, op, ...v]) => String(r[c!] ?? "").toLowerCase().includes(v.join(".").replace(/%/g, "").toLowerCase()) && op === "ilike"));
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) { this.ord.push([c, o?.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from = a; this.lim = b - a + 1; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  private run(): Res {
    let out = this.rows.filter((r) => this.f.every((fn) => fn(r)));
    const total = out.length;
    for (const [c, asc] of [...this.ord].reverse()) {
      out = [...out].sort((a, b) => {
        const x = a[c], y = b[c];
        if (x === y) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    out = out.slice(this.from, this.lim == null ? undefined : this.from + this.lim);
    if (this.head) return { data: null, error: null, count: total };
    if (this.one) return { data: out[0] ?? null, error: out[0] || this.one === "maybe" ? null : { message: "No rows" } };
    return { data: out, error: null, count: this.count ? total : null };
  }
  then<A, B>(ok?: ((v: Res) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(ok, bad);
  }
}

export function mockDb(data: Record<string, Row[]>) {
  return { from: (t: string) => new Q(data[t] ?? []) };
}
