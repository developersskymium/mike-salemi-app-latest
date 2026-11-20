import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      title="That lesson isn’t here"
      body="It may have moved. Open the course from Programs to pick up where you left off."
      action={<Button href="/programs" variant="glass">All programs</Button>}
    />
  );
}
