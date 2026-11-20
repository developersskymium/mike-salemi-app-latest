import { ProgramsSkeleton } from "@/components/discover/ProgramsTab";
import { ProgramRouteSkeleton } from "@/components/shell/ProgramRouteSkeleton";
import "@/components/discover/catalog/catalog.css";

/** Wraps every /programs route: draws the skeleton of the page that is coming (see RouteSkeleton). */
export default function Loading() {
  return <ProgramRouteSkeleton catalog={<ProgramsSkeleton />} />;
}
