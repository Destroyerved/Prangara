import type { ReactNode } from "react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { Empty, Skeleton } from "./common";
import { FlowButton } from "./flow-button";

export default function AssessmentGate({ children }: { children: ReactNode }) {
  const w = useWorkspace();
  if (w.demo.isPending && !w.assessment) return <Skeleton />;
  if (w.demo.isError && !w.assessment)
    return (
      <Empty
        title="Assessment could not be loaded"
        description={w.demo.error.message}
        action={
          <FlowButton text="Retry assessment" onClick={() => w.demo.refetch()} />
        }
      />
    );
  if (!w.assessment)
    return (
      <Empty
        title="No facility selected"
        description="Select an industrial facility to view its carbon footprint and circular interventions."
        action={
          <FlowButton
            text="Load Facility Profile"
            onClick={() => w.selectPlant("textile_dyeing")}
          />
        }
      />
    );
  return children;
}
