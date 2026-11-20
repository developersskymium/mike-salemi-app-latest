import type { Metadata } from "next";
import { YouScreen } from "@/components/you/YouScreen";
import { loadYou } from "@/lib/loaders/today-plan-you";

export const metadata: Metadata = { title: "You" };

export default async function Page() {
  const d = await loadYou();
  return <YouScreen d={d} />;
}
