import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Action } from "../../types/domain";
import { money, number, payback, label } from "../../lib/format";
import { useWorkspace } from "../../hooks/useWorkspace";
import { DataTable } from "../tables/DataTable";
import { Badge } from "../ui/common";
export function ActionTable({
  items,
  compact = false,
}: {
  items: Action[];
  compact?: boolean;
}) {
  const w = useWorkspace();
  const columns = useMemo<ColumnDef<Action>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Intervention",
        cell: (info) => (
          <div className="record-name">
            <span>{String(info.getValue())}</span>
            <small>
              {label(info.row.original.category)} ·{" "}
              {label(info.row.original.target)}
            </small>
          </div>
        ),
      },
      {
        accessorKey: "net_benefit",
        header: "Annual benefit",
        cell: (info) => (
          <span className={info.row.original.net_benefit > 0 ? "positive" : ""}>
            {money(info.row.original.net_benefit)}
          </span>
        ),
      },
      {
        accessorKey: "capex",
        header: "CAPEX",
        cell: (info) => money(info.row.original.capex),
      },
      {
        accessorKey: "payback_years",
        header: "Payback",
        cell: (info) => payback(info.row.original.payback_years),
      },
      {
        accessorKey: "abatement_t",
        header: "Abatement",
        cell: (info) => (
          <>
            {number(info.row.original.abatement_t)} <small>tCO₂e</small>
          </>
        ),
      },
      ...(!compact
        ? ([
            {
              accessorKey: "lcoa",
              header: "₹ / tCO₂e",
              cell: (info: { row: { original: Action } }) =>
                money(info.row.original.lcoa),
            },
            {
              accessorKey: "difficulty",
              header: "Difficulty",
              cell: (info: { row: { original: Action } }) => (
                <span className="difficulty">
                  {info.row.original.difficulty}/5
                </span>
              ),
            },
            {
              accessorKey: "confidence",
              header: "Confidence",
              cell: (info: { row: { original: Action } }) =>
                label(info.row.original.confidence),
            },
          ] as ColumnDef<Action>[])
        : []),
      {
        id: "status",
        header: "Status",
        accessorFn: (row) =>
          row.cap_pct
            ? "Capped"
            : row.quick_win
              ? "Quick win"
              : label(row.status),
        cell: (info) => (
          <Badge
            tone={
              info.row.original.cap_pct
                ? "moderate"
                : info.row.original.status === "cash_positive"
                  ? "positive"
                  : "cost"
            }
          >
            {info.row.original.cap_pct
              ? "Capped · " + info.row.original.cap_pct + "%"
              : info.row.original.quick_win
                ? "Quick win"
                : label(info.row.original.status)}
          </Badge>
        ),
      },
    ],
    [compact],
  );
  return (
    <DataTable
      data={items}
      columns={columns}
      caption="Circular intervention business cases"
      onRow={(data) => w.setDrawer({ kind: "action", data })}
      initialSort={[{ id: "net_benefit", desc: true }]}
      initialVisibility={{ difficulty: false, confidence: false }}
      columnControl={!compact}
    />
  );
}
