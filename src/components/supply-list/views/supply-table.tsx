"use client";

import { Fragment, useState, useCallback, type KeyboardEvent } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortableColumn } from "@/convex/lib/types";
import type { SupplyItem } from "@/types/supply-item";

interface SupplyTableProps {
  items: SupplyItem[];
  onSort?: (field: SortableColumn, order: "asc" | "desc") => void;
  sortBy?: SortableColumn;
  sortOrder?: "asc" | "desc";
}

const COLUMNS: Array<{
  key: SortableColumn;
  label: string;
  sortable: boolean;
}> = [
  { key: "itemNumber", label: "Item Number", sortable: true },
  { key: "partNumber", label: "Part Number", sortable: true },
  { key: "description", label: "Description", sortable: true },
  { key: "quantity", label: "Qty", sortable: true },
  { key: "caseNumber", label: "Case", sortable: true },
  { key: "palletNumber", label: "Pallet", sortable: true },
  { key: "plNumber", label: "PL Number", sortable: true },
  { key: "pwbs", label: "PWBS", sortable: true },
];

export function SupplyTable({
  items,
  onSort,
  sortBy,
  sortOrder = "asc",
}: SupplyTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = useCallback(
    (field: SortableColumn) => {
      if (!onSort) return;

      const newOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";
      onSort(field, newOrder);
    },
    [onSort, sortBy, sortOrder],
  );

  const handleSortKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableCellElement>, field: SortableColumn) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSort(field);
      }
    },
    [handleSort],
  );

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRow(expandedRow === itemId ? null : itemId);
  };

  const handleRowKeyDown = (
    e: KeyboardEvent<HTMLTableRowElement>,
    itemId: string,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRowExpansion(itemId);
    }
  };

  const getAriaSort = (
    field: SortableColumn,
  ): "ascending" | "descending" | undefined => {
    if (sortBy !== field) return undefined;
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  return (
    <div className="hidden lg:block rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable && onSort
                    ? "cursor-pointer select-none hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    : "",
                )}
                onClick={() => column.sortable && handleSort(column.key)}
                onKeyDown={(e) =>
                  column.sortable && handleSortKeyDown(e, column.key)
                }
                tabIndex={column.sortable && onSort ? 0 : undefined}
                role={column.sortable && onSort ? "button" : undefined}
                aria-sort={
                  column.sortable ? getAriaSort(column.key) : undefined
                }
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortBy === column.key && (
                    <span className="text-muted-foreground">
                      {sortOrder === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="text-center py-8">
                <p className="text-muted-foreground">No items found</p>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <Fragment key={item._id}>
                <TableRow
                  className={cn(
                    "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
                    expandedRow === item._id && "bg-muted/30",
                  )}
                  onClick={() => toggleRowExpansion(item._id)}
                  onKeyDown={(e) => handleRowKeyDown(e, item._id)}
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedRow === item._id}
                >
                  <TableCell className="font-medium">
                    {item.itemNumber || "—"}
                  </TableCell>
                  <TableCell>{item.partNumber || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity ?? "—"}
                  </TableCell>
                  <TableCell>
                    {item.caseNumber ? (
                      <Badge variant="outline">{item.caseNumber}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {item.palletNumber ? (
                      <Badge variant="outline">{item.palletNumber}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{item.plNumber || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.pwbs}</span>
                      {item.pwbsName && (
                        <span className="text-xs text-muted-foreground">
                          {item.pwbsName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRow === item._id && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="bg-muted/10">
                      <div className="p-4 space-y-3">
                        <h4 className="font-semibold text-sm">Item Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <dt className="text-muted-foreground">
                              Item Number
                            </dt>
                            <dd className="font-medium">
                              {item.itemNumber || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Part Number
                            </dt>
                            <dd className="font-medium">
                              {item.partNumber || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Project</dt>
                            <dd className="font-medium">
                              {item.projectNumber}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">PWBS</dt>
                            <dd className="font-medium">
                              {item.pwbs}
                              {item.pwbsName && ` - ${item.pwbsName}`}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Quantity</dt>
                            <dd className="font-medium">
                              {item.quantity ?? "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Weight (kg)
                            </dt>
                            <dd className="font-medium">
                              {item.weightKg ? item.weightKg.toFixed(2) : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Case Number
                            </dt>
                            <dd className="font-medium">
                              {item.caseNumber || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Pallet Number
                            </dt>
                            <dd className="font-medium">
                              {item.palletNumber || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">PL Number</dt>
                            <dd className="font-medium">
                              {item.plNumber || "—"}
                            </dd>
                          </div>
                        </div>
                        {item.description && (
                          <div>
                            <dt className="text-muted-foreground text-sm">
                              Full Description
                            </dt>
                            <dd className="mt-1">{item.description}</dd>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
