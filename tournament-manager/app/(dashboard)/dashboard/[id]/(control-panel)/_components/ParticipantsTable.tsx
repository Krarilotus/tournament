"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SerializedParticipant } from "@/lib/models/Participant";
import { ParticipantActions } from "./ParticipantActions";
import { ParticipantStatusToggle } from "./ParticipantStatusToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftRight,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";

export type ParticipantsLayout = {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  sorting: { id: string; desc: boolean }[];
};

interface ParticipantsTableProps {
  data: SerializedParticipant[];
  tiebreakers?: string[];
  onParticipantsChanged?: () => void;
  initialLayout?: ParticipantsLayout;
  onLayoutChange?: (layout: ParticipantsLayout) => void;
}

// Human-friendly header label for a stat key like "points" or "custom_Kills"
function prettyStatLabel(key: string): string {
  if (key.startsWith("custom_")) {
    const raw = key.slice("custom_".length);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Safely access a score field from participant.scores
function getScore(p: SerializedParticipant, key: string): number | null {
  const scores = (p as any).scores as Record<string, unknown> | undefined;
  const val = scores?.[key];
  return typeof val === "number" ? val : null;
}

export function ParticipantsTable({
  data,
  tiebreakers = [],
  onParticipantsChanged,
  initialLayout,
  onLayoutChange,
}: ParticipantsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>(() =>
    initialLayout?.sorting ?? [{ id: "name", desc: false }]
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(
      () => initialLayout?.columnVisibility ?? {}
    );

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(
      () => initialLayout?.columnOrder ?? []
    );

  const visibleTieBreakers = React.useMemo(
    () => new Set(tiebreakers.slice(0, 2)), // only first two visible by default
    [tiebreakers]
  );

  // Base columns
  const baseColumns = React.useMemo<ColumnDef<SerializedParticipant>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        enableSorting: true,
      },
      {
        id: "customId",
        accessorKey: "customId",
        header: "Custom ID",
        cell: ({ row }) => row.original.customId || "N/A",
        enableSorting: true,
      },
      {
        id: "wins",
        header: "Wins",
        enableSorting: true,
        accessorFn: (row) => getScore(row, "wins") ?? 0,
      },
      {
        id: "losses",
        header: "Losses",
        enableSorting: true,
        accessorFn: (row) => getScore(row, "losses") ?? 0,
      },
      {
        id: "isActive",
        header: "Active",
        enableSorting: false,
        cell: ({ row }) => (
          <ParticipantStatusToggle
            participantId={row.original._id}
            isActive={row.original.isActive}
            onParticipantsChanged={onParticipantsChanged}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <ParticipantActions
            participantId={row.original._id}
            onParticipantsChanged={onParticipantsChanged}
          />
        ),
      },
    ],
    [onParticipantsChanged]
  );

  // Extra columns from tie-breakers (excluding ones we already show)
  const extraTiebreakerCols = React.useMemo<
    ColumnDef<SerializedParticipant>[]
  >(() => {
    const alreadyHandled = new Set(["wins", "losses"]);

    return tiebreakers
      .filter((tb) => !alreadyHandled.has(tb))
      .map<ColumnDef<SerializedParticipant>>((tbKey) => ({
        id: tbKey,
        header: prettyStatLabel(tbKey),
        enableSorting: true,
        accessorFn: (row) => getScore(row, tbKey) ?? 0,
      }));
  }, [tiebreakers]);

  // Insert extra tiebreaker columns between "customId" and "points"
  const allColumns = React.useMemo(
    () => [...baseColumns.slice(0, 2), ...extraTiebreakerCols, ...baseColumns.slice(2)],
    [baseColumns, extraTiebreakerCols]
  );

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  });

  const leafColumns = table.getAllLeafColumns();

  // Default column visibility:
  // - if initialLayout exists, we respect it and do nothing here
  // - if no initialLayout and no visibility set yet, apply default:
  //   - tie-breakers: only first two visible
  //   - others: visible
  React.useEffect(() => {
    if (initialLayout) return;
    if (Object.keys(columnVisibility).length > 0) return;

    const next: VisibilityState = {};

    for (const col of leafColumns) {
      const id = col.id;
      if (tiebreakers.includes(id)) {
        next[id] = visibleTieBreakers.has(id);
      } else {
        next[id] = true;
      }
    }

    setColumnVisibility(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    leafColumns.length,
    tiebreakers.join(","),
    visibleTieBreakers.size,
    initialLayout,
  ]);

  // Effective column order: from state if present, otherwise from leaf columns
  const effectiveOrder: string[] =
    columnOrder.length > 0
      ? columnOrder
      : leafColumns.map((c) => c.id);

  // Initialize columnOrder once we have columns if it's empty
  React.useEffect(() => {
    if (columnOrder.length === 0 && leafColumns.length > 0) {
      const defaultOrder = leafColumns.map((c) => c.id);
      setColumnOrder(defaultOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafColumns.length]);

  // Single "swap right" function
  const swapColumnRight = (id: string) => {
    const order =
      table.getState().columnOrder.length > 0
        ? table.getState().columnOrder
        : leafColumns.map((c) => c.id);

    const idx = order.indexOf(id);
    if (idx === -1 || idx === order.length - 1) return; // can't move last

    const newOrder = [...order];
    const targetIdx = idx + 1;
    [newOrder[idx], newOrder[targetIdx]] = [
      newOrder[targetIdx],
      newOrder[idx],
    ];
    setColumnOrder(newOrder);
  };

  // Notify parent when layout changes (for persistence)
  React.useEffect(() => {
    if (!onLayoutChange) return;

    onLayoutChange({
      columnOrder: effectiveOrder,
      columnVisibility,
      sorting: sorting.map((s) => ({ id: s.id, desc: !!s.desc })),
    });
  }, [sorting, columnVisibility, effectiveOrder, onLayoutChange]);

  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();

  return (
    <div className="space-y-2">
      {/* Toolbar: column visibility controls */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Click a header to sort. Use the swap icon to reorder columns.
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-3 w-3" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {leafColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(e) => e.preventDefault()} // <- keep menu open
              >
                {column.columnDef.header
                  ? String(
                      typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id
                    )
                  : column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const col = header.column;
                  const canSort = col.getCanSort();
                  const sortDir = col.getIsSorted();

                  if (header.isPlaceholder) {
                    return <TableHead key={header.id} />;
                  }

                  const colId = col.id;
                  const idx = effectiveOrder.indexOf(colId);
                  const isLast = idx === effectiveOrder.length - 1;

                  return (
                    <TableHead key={header.id}>
                      <div className="flex items-center gap-1">
                        {canSort ? (
                          <button
                            type="button"
                            onClick={col.getToggleSortingHandler()}
                            className="flex items-center gap-1 text-xs font-medium hover:text-foreground"
                          >
                            {flexRender(
                              col.columnDef.header,
                              header.getContext()
                            )}
                            <ArrowUpDown className="h-3 w-3" />
                            {sortDir === "asc" && (
                              <span className="text-[10px]">↑</span>
                            )}
                            {sortDir === "desc" && (
                              <span className="text-[10px]">↓</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs font-medium">
                            {flexRender(
                              col.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                        )}

                        {/* swap button: only if not last column */}
                        {!isLast && (
                          <button
                            type="button"
                            className="p-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => swapColumnRight(colId)}
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rowModel.rows.length ? (
              rowModel.rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={leafColumns.length}
                  className="h-24 text-center"
                >
                  No participants added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
