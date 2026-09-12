import { useWorkspace } from "../../hooks/useWorkspace";
import { Badge, DetailRows, Note } from "./common";

/** Availability of current response metadata, never a computed quality score. */
export function EvidenceStatus() {
  const { assessment } = useWorkspace();
  const demo = assessment?.origin.kind === "development_fixture";
  return (
    <>
      <div className="drawer-chips">
        <Badge>Evidence not supplied</Badge>
      </div>
      <DetailRows
        rows={[
          ["Data origin", demo ? "Development demo" : "Engine response"],
          ["Data-quality score", "Not supplied"],
          ["Field verification", "Not supplied"],
          ["Linked documents", "Not supplied"],
        ]}
      />
      <Note>
        {demo
          ? "These are demonstration values, not verified factory measurements. Evidence and data-quality records are not included."
          : "This response does not include evidence or field-quality records. A calculated result does not establish that its inputs have been verified."}
      </Note>
    </>
  );
}
