import type { HmcTableView } from "@/lib/hmcColumnSettings";

export type HmcColumnWidths = Record<string, number>;

export const HMC_DEFAULT_COLUMN_WIDTH = 120;
export const HMC_MIN_COLUMN_WIDTH = 60;
export const HMC_MAX_COLUMN_WIDTH = 480;
export const HMC_SR_NO_COLUMN_WIDTH = 72;

const STORAGE_KEY = "hmc-column-widths-v1";

type StoredWidths = Partial<Record<HmcTableView, HmcColumnWidths>>;

export function clampHmcColumnWidth(width: number) {
  return Math.min(
    HMC_MAX_COLUMN_WIDTH,
    Math.max(HMC_MIN_COLUMN_WIDTH, Math.round(width))
  );
}

export function getHmcColumnWidth(
  widths: HmcColumnWidths,
  columnKey: string,
  fallback = HMC_DEFAULT_COLUMN_WIDTH
) {
  const value = widths[columnKey];
  return value ? clampHmcColumnWidth(value) : fallback;
}

export function mergeHmcColumnWidths(
  columnKeys: string[],
  widths: HmcColumnWidths
): HmcColumnWidths {
  const validKeys = new Set(columnKeys);
  const merged: HmcColumnWidths = {};

  for (const key of columnKeys) {
    if (widths[key]) {
      merged[key] = clampHmcColumnWidth(widths[key]);
    }
  }

  for (const key of Object.keys(widths)) {
    if (!validKeys.has(key)) {
      delete merged[key];
    }
  }

  return merged;
}

export function loadHmcColumnWidths(view: HmcTableView): HmcColumnWidths {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as StoredWidths;
    return parsed[view] || {};
  } catch {
    return {};
  }
}

export function saveHmcColumnWidths(view: HmcTableView, widths: HmcColumnWidths) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: StoredWidths = raw ? JSON.parse(raw) : {};
    parsed[view] = widths;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures.
  }
}

export function clampHmcGroupTotalWidth(childCount: number, totalWidth: number) {
  if (childCount <= 0) return 0;

  const minTotal = HMC_MIN_COLUMN_WIDTH * childCount;
  const maxTotal = HMC_MAX_COLUMN_WIDTH * childCount;

  return Math.min(maxTotal, Math.max(minTotal, Math.round(totalWidth)));
}

export function distributeGroupColumnWidth(childCount: number, totalWidth: number) {
  if (childCount <= 0) return HMC_DEFAULT_COLUMN_WIDTH;

  const clampedTotal = clampHmcGroupTotalWidth(childCount, totalWidth);
  return clampHmcColumnWidth(Math.round(clampedTotal / childCount));
}

export function getGroupColumnWidth(
  childKeys: string[],
  widths: HmcColumnWidths,
  fallback = HMC_DEFAULT_COLUMN_WIDTH
) {
  return childKeys.reduce(
    (total, key) => total + getHmcColumnWidth(widths, key, fallback),
    0
  );
}

export function getHmcTableWidth(
  columnKeys: string[],
  widths: HmcColumnWidths,
  options?: { showSrNo?: boolean; defaultColumnWidth?: number }
) {
  const showSrNo = options?.showSrNo ?? true;
  const defaultColumnWidth =
    options?.defaultColumnWidth ?? HMC_DEFAULT_COLUMN_WIDTH;

  const columnsTotal = columnKeys.reduce(
    (total, key) => total + getHmcColumnWidth(widths, key, defaultColumnWidth),
    0
  );

  return (showSrNo ? HMC_SR_NO_COLUMN_WIDTH : 0) + columnsTotal;
}
