import { Button, EmptyState, Glass } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import "@/components/commerce/commerce.css";

export default function RunNotFound() {
  return (
    <div className="com-result">
      <Glass radius="card" className="com-result-card">
        <EmptyState illustration={<EmptyScene scene="no-programs" size={160} />} title="We couldn’t find that retreat" body="It may have moved or the link is old." action={<Button variant="glass" size="md" href="/programs">See experiences</Button>} />
      </Glass>
    </div>
  );
}
