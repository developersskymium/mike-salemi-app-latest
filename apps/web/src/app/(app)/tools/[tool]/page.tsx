import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferSlot } from "@/components/commerce/OfferSlot";
import { ToolFlow } from "@/components/discover/tools/ToolFlow";
import { Button, EmptyState } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { loadTool } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/tools/tools.css";

const NAMES: Record<string, string> = {
  "kettlebell-selector": "Kettlebell Selector",
  "stretch-test": "Stretch Test",
  "readiness-check": "Readiness Check",
  "kettlebell-roadmap": "Kettlebell Roadmap",
};

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  return { title: NAMES[tool] ?? "Tool" };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: id } = await params;
  if (!/^[a-z0-9-]{2,40}$/.test(id)) notFound();
  const { supabase, user } = await getUser();
  let page;
  try {
    page = await loadTool(supabase, user!.id, id);
  } catch {
    return (
      <EmptyState
        title="This tool didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href={`/tools/${id}`}>Try again</Button>}
      />
    );
  }
  if (!page) notFound();
  return (
    <ToolFlow
      tool={page.tool}
      form={page.form}
      last={page.last}
      followAlong={page.followAlong}
      offer={<OfferSlot placement="tool_result" context={{ tool_id: id }} />}
    />
  );
}
