// Regenerates src/tokens.css from src/tokens.ts. Run: pnpm --filter @ms/tokens build:css
import { writeFileSync } from "node:fs";
import { toCss } from "../src/css";

writeFileSync(new URL("../src/tokens.css", import.meta.url), toCss());
console.log("tokens.css written");
