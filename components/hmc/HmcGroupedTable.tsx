"use client";

import { useCallback, useRef } from "react";
import {
  formatCellValue,
  formatHmcSummaryTotalValue,
  getRowCellValue,
  HMC_SUMMARY_TOTAL_METRICS,
  normalizeHmcTableStructure,
} from "@/lib/hmcJobData";
import type { HmcColumnDef, HmcHeaderGroup } from "@/lib/hmcJobData";
import {
  HMC_DEFAULT_COLUMN_WIDTH,
  HMC_SR_NO_COLUMN_WIDTH,
  clampHmcColumnWidth,
  distributeGroupColumnWidth,
  getHmcTableWidth,
} from "@/lib/hmcColumnWidths";
import { cn } from "@/lib/utils";

const headerClassName =
  "border border-gray-300 bg-gray-100 px-2 py-2 text-center text-xs font-semibold";
const cellClassName =
  "overflow-hidden text-ellipsis whitespace-nowrap border border-gray-200 bg-white px-2 py-2 text-xs";
const totalsClassName =
  "overflow-hidden text-ellipsis whitespace-nowrap border border-gray-300 bg-gray-50 px-2 py-2 text-center text-xs font-bold";

const totalColumnStyles = Object.fromEntries(
  HMC_SUMMARY_TOTAL_METRICS.map((metric) => [metric.key, metric.className])
) as Record<string, string>;

type HmcGroupedTableProps = {
  headerGroups?: HmcHeaderGroup[];
  columns?: Array<HmcColumnDef | string>;
  rows?: Record<string, string | number | null | undefined>[];
  showSrNo?: boolean;
  onRowClick?: (rowIndex: number) => void;
  getSrNo?: (rowIndex: number) => number | string;
  getColumnWidth?: (columnKey: string) => number;
  onColumnWidthChange?: (columnKey: string, width: number) => void;
  onColumnWidthsChange?: (updates: Record<string, number>) => void;
  defaultColumnWidth?: number;
  summaryTotals?: Record<string, number>;
};

type ResizableHeaderCellProps = {
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  width?: number;
  onResizeStart?: (event: React.MouseEvent) => void;
  children: React.ReactNode;
};

function ResizableHeaderCell({
  className,
  colSpan,
  rowSpan,
  width,
  onResizeStart,
  children,
}: ResizableHeaderCellProps) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={
        width
          ? {
              width,
              minWidth: width,
              maxWidth: width,
            }
          : undefined
      }
      className={cn(headerClassName, "relative align-middle", className)}
    >
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </span>
      {onResizeStart ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${children} column`}
          className="absolute -right-px top-0 z-[2] h-full w-2 cursor-col-resize touch-none select-none hover:bg-[#DB4848]/35 active:bg-[#DB4848]/60"
          onMouseDown={onResizeStart}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </th>
  );
}

export default function HmcGroupedTable({
  headerGroups: headerGroupsProp,
  columns: columnsProp,
  rows: rowsProp,
  showSrNo = false,
  onRowClick,
  getSrNo,
  getColumnWidth,
  onColumnWidthChange,
  onColumnWidthsChange,
  defaultColumnWidth = HMC_DEFAULT_COLUMN_WIDTH,
  summaryTotals,
}: HmcGroupedTableProps) {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const { headerGroups, columns } = normalizeHmcTableStructure({
    headerGroups: headerGroupsProp,
    columns: columnsProp,
  });
  const rows = rowsProp || [];
  const hasGroupedHeaders = headerGroups.some((group) => group.colspan > 1);
  const isResizable = Boolean(getColumnWidth && onColumnWidthChange);

  const resolveWidth = useCallback(
    (columnKey: string) =>
      getColumnWidth?.(columnKey) ?? defaultColumnWidth,
    [defaultColumnWidth, getColumnWidth]
  );

  const syncHeaderScroll = useCallback(() => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  }, []);

  const startResize = useCallback(
    (event: React.MouseEvent, columnKey: string) => {
      if (!onColumnWidthChange) return;

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = resolveWidth(columnKey);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent: MouseEvent) => {
        onColumnWidthChange(
          columnKey,
          clampHmcColumnWidth(startWidth + moveEvent.clientX - startX)
        );
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onColumnWidthChange, resolveWidth]
  );

  const startGroupResize = useCallback(
    (event: React.MouseEvent, group: HmcHeaderGroup) => {
      if (!onColumnWidthsChange) return;

      event.preventDefault();
      event.stopPropagation();

      const childKeys = group.children.map((child) => child.key);
      const startX = event.clientX;
      const startTotal = childKeys.reduce(
        (total, key) => total + resolveWidth(key),
        0
      );

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextTotal = startTotal + moveEvent.clientX - startX;
        const perColumn = distributeGroupColumnWidth(
          childKeys.length,
          nextTotal
        );
        const updates = Object.fromEntries(
          childKeys.map((key) => [key, perColumn])
        );
        onColumnWidthsChange(updates);
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onColumnWidthsChange, resolveWidth]
  );

  const tableWidth = isResizable
    ? getHmcTableWidth(
        columns.map((column) => column.key),
        Object.fromEntries(
          columns.map((column) => [column.key, resolveWidth(column.key)])
        ),
        { showSrNo, defaultColumnWidth }
      )
    : undefined;

  const tableClassName = cn(
    "border-separate border-spacing-0 text-xs",
    isResizable ? "table-fixed" : "min-w-max w-full"
  );

  const tableStyle = tableWidth
    ? { width: tableWidth, minWidth: tableWidth }
    : undefined;

  const renderColGroup = () =>
    isResizable ? (
      <colgroup>
        {showSrNo ? <col style={{ width: HMC_SR_NO_COLUMN_WIDTH }} /> : null}
        {columns.map((column) => {
          const width = resolveWidth(column.key);
          return (
            <col
              key={column.key}
              style={{ width, minWidth: width, maxWidth: width }}
            />
          );
        })}
      </colgroup>
    ) : null;

  const renderHeader = () => (
    <thead>
      <tr>
        {showSrNo ? (
          <th
            rowSpan={hasGroupedHeaders ? 2 : 1}
            style={
              isResizable
                ? {
                    width: HMC_SR_NO_COLUMN_WIDTH,
                    minWidth: HMC_SR_NO_COLUMN_WIDTH,
                    maxWidth: HMC_SR_NO_COLUMN_WIDTH,
                  }
                : undefined
            }
            className={cn(headerClassName, "whitespace-nowrap align-middle")}
          >
            Sr. No.
          </th>
        ) : null}
        {headerGroups.map((group) => {
          if (group.colspan === 1) {
            const child = group.children[0];

            return (
              <ResizableHeaderCell
                key={`${group.label}-${child.key}`}
                rowSpan={group.rowSpan}
                width={isResizable ? resolveWidth(child.key) : undefined}
                onResizeStart={
                  isResizable
                    ? (event) => startResize(event, child.key)
                    : undefined
                }
              >
                {group.label}
              </ResizableHeaderCell>
            );
          }

          const groupWidth = isResizable
            ? group.children.reduce(
                (total, child) => total + resolveWidth(child.key),
                0
              )
            : undefined;

          return (
            <ResizableHeaderCell
              key={`${group.label}-${group.children[0]?.key}`}
              colSpan={group.colspan}
              rowSpan={group.rowSpan}
              width={groupWidth}
              onResizeStart={
                isResizable && onColumnWidthsChange
                  ? (event) => startGroupResize(event, group)
                  : undefined
              }
            >
              {group.label}
            </ResizableHeaderCell>
          );
        })}
      </tr>
      {hasGroupedHeaders ? (
        <tr>
          {headerGroups
            .filter((group) => group.colspan > 1)
            .flatMap((group) =>
              group.children.map((child) => (
                <th
                  key={child.key}
                  style={
                    isResizable
                      ? {
                          width: resolveWidth(child.key),
                          minWidth: resolveWidth(child.key),
                          maxWidth: resolveWidth(child.key),
                        }
                      : undefined
                  }
                  className={cn(
                    headerClassName,
                    "overflow-hidden text-ellipsis whitespace-nowrap"
                  )}
                >
                  {child.label}
                </th>
              ))
            )}
        </tr>
      ) : null}
    </thead>
  );

  const renderTotalsRow = () => {
    if (!summaryTotals) return null;

    return (
      <tbody>
        <tr>
          {showSrNo ? <td className={totalsClassName} /> : null}
          {columns.map((column) => {
            const totalValue = summaryTotals[column.key];

            return (
              <td
                key={`total-${column.key}`}
                className={cn(
                  totalsClassName,
                  totalValue !== undefined ? totalColumnStyles[column.key] : ""
                )}
              >
                {totalValue !== undefined
                  ? formatHmcSummaryTotalValue(column.key, totalValue)
                  : ""}
              </td>
            );
          })}
        </tr>
      </tbody>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div ref={headerScrollRef} className="shrink-0 overflow-hidden bg-gray-100">
        <table className={tableClassName} style={tableStyle}>
          {renderColGroup()}
          {renderHeader()}
          {renderTotalsRow()}
        </table>
      </div>

      <div
        ref={bodyScrollRef}
        className="min-h-0 flex-1 overflow-auto bg-white"
        onScroll={syncHeaderScroll}
      >
        <table className={tableClassName} style={tableStyle}>
          {renderColGroup()}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : undefined
                }
                onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              >
                {showSrNo ? (
                  <td className={cn(cellClassName, "font-medium")}>
                    {getSrNo ? getSrNo(rowIndex) : rowIndex + 1}
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className={cellClassName}
                    title={String(
                      formatCellValue(getRowCellValue(row, column))
                    )}
                  >
                    {formatCellValue(getRowCellValue(row, column))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
