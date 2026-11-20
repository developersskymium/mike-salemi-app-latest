import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return <EmptyState title="No intake for this program" body="This program doesn’t have an intake yet. You can start it straight away." action={<Button href="/programs" variant="glass">All programs</Button>} />;
}
