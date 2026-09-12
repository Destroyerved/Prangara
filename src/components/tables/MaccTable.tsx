import type { ColumnDef } from "@tanstack/react-table";
import type { Action, Assessment, PortfolioMode } from "../../types/domain";
import { DataTable } from "./DataTable";
import { Empty } from "../ui/common";
import { number, portfolioLabels } from "../../lib/format";

type CurvePoint =
  Assessment["recommendations"]["portfolios"]["all"]["curve"][number];
export function MaccTable({
  curve,
  actions,
  mode,
  onOpen,
}: {
  curve: CurvePoint[];
  actions: Action[];
  mode: PortfolioMode;
  onOpen: (action: Action) => void;
}) {
  const columns: ColumnDef<CurvePoint>[] = [
    {
      accessorKey: "id",
      header: "Intervention",
      cell: ({ row }) => {
        const action = actions.find((a) => a.id === row.original.id);
        return action ? (
          <button className="row-title" onClick={() => onOpen(action)}>
            {action.name}
          </button>
        ) : (
          row.original.id
        );
      },
    },
    {
      accessorKey: "abatement_t",
      header: "Portfolio abatement · tCO₂e / yr",
      cell: ({ row }) => number(row.original.abatement_t, 3),
    },
    {
      accessorKey: "lcoa",
      header: "LCOA · ₹ / tCO₂e",
      cell: ({ row }) => number(row.original.lcoa, 2),
    },
  ];
  if (!curve.length)
    return (
      <Empty
        title="MACC data unavailable"
        description="No curve values were supplied for this portfolio."
      />
    );
  return (
    <DataTable
      data={curve}
      columns={columns}
      initialSort={[{ id: "lcoa", desc: false }]}
      caption={portfolioLabels[mode] + " — MACC data"}
    />
  );
}
