import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ArrowUpDown, SlidersHorizontal, Check } from "lucide-react";
import { Empty } from "../ui/common";
export function DataTable<T>({
  data,
  columns,
  onRow,
  caption,
  initialSort = [],
  initialVisibility = {},
  columnControl = false,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  onRow?: (row: T) => void;
  caption: string;
  initialSort?: SortingState;
  initialVisibility?: VisibilityState;
  columnControl?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort),
    [visibility, setVisibility] = useState<VisibilityState>(initialVisibility);
  // TanStack Table supplies a stable table instance; this component deliberately renders its returned row model.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className="table-module">
      {columnControl && (
        <div className="table-options">
          <span>{data.length} records</span>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button className="text-button">
                <SlidersHorizontal size={14} />
                Columns
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content className="popover column-menu" align="end">
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.id !== "name")
                  .map((c) => (
                    <Dropdown.CheckboxItem
                      className="menu-check"
                      key={c.id}
                      checked={c.getIsVisible()}
                      onCheckedChange={(v) => c.toggleVisibility(v)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span>{String(c.columnDef.header)}</span>
                      <Dropdown.ItemIndicator>
                        <Check size={14} />
                      </Dropdown.ItemIndicator>
                    </Dropdown.CheckboxItem>
                  ))}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      )}
      {data.length ? (
        <div
          className="table-scroll"
          tabIndex={0}
          aria-label={caption + " scroll area"}
        >
          <table>
            <caption className="sr-only">{caption}</caption>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown size={12} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <td key={cell.id}>
                      {index === 0 && onRow ? (
                        <button
                          className="row-title"
                          onClick={() => onRow(row.original)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </button>
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </div>
  );
}
