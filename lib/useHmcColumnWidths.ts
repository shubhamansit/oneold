"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HmcTableView } from "@/lib/hmcColumnSettings";
import {
  clampHmcColumnWidth,
  getHmcColumnWidth,
  loadHmcColumnWidths,
  mergeHmcColumnWidths,
  saveHmcColumnWidths,
  type HmcColumnWidths,
  HMC_DEFAULT_COLUMN_WIDTH,
} from "@/lib/hmcColumnWidths";

export function useHmcColumnWidths(view: HmcTableView, columnKeys: string[]) {
  const [widths, setWidths] = useState<HmcColumnWidths>({});

  useEffect(() => {
    setWidths(loadHmcColumnWidths(view));
  }, [view]);

  const mergedWidths = useMemo(
    () => mergeHmcColumnWidths(columnKeys, widths),
    [columnKeys, widths]
  );

  const getColumnWidth = useCallback(
    (columnKey: string) =>
      getHmcColumnWidth(mergedWidths, columnKey, HMC_DEFAULT_COLUMN_WIDTH),
    [mergedWidths]
  );

  const setColumnWidth = useCallback(
    (columnKey: string, width: number) => {
      setWidths((current) => {
        const next = mergeHmcColumnWidths(columnKeys, {
          ...current,
          [columnKey]: clampHmcColumnWidth(width),
        });
        saveHmcColumnWidths(view, next);
        return next;
      });
    },
    [columnKeys, view]
  );

  const setColumnWidths = useCallback(
    (updates: Record<string, number>) => {
      setWidths((current) => {
        const next = mergeHmcColumnWidths(columnKeys, {
          ...current,
          ...Object.fromEntries(
            Object.entries(updates).map(([key, width]) => [
              key,
              clampHmcColumnWidth(width),
            ])
          ),
        });
        saveHmcColumnWidths(view, next);
        return next;
      });
    },
    [columnKeys, view]
  );

  return {
    widths: mergedWidths,
    getColumnWidth,
    setColumnWidth,
    setColumnWidths,
  };
}
