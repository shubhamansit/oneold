import type { HmcColumnDef, HmcHeaderGroup } from "@/lib/hmcJobData";

export type HmcTableView = "summary" | "detail";

export type HmcColumnPreference = {
  order: string[];
  hidden: string[];
};

const STORAGE_KEY = "hmc-column-settings-v1";

type StoredSettings = Partial<Record<HmcTableView, HmcColumnPreference>>;

export function getHmcColumnDisplayLabel(column: HmcColumnDef) {
  if (column.group && column.group !== column.label) {
    return `${column.group} / ${column.label}`;
  }

  return column.label;
}

export function createDefaultPreferences(
  columns: HmcColumnDef[]
): HmcColumnPreference {
  return {
    order: columns.map((column) => column.key),
    hidden: [],
  };
}

export function mergePreferencesWithColumns(
  columns: HmcColumnDef[],
  prefs: HmcColumnPreference
): HmcColumnPreference {
  const validKeys = new Set(columns.map((column) => column.key));

  return {
    order: [
      ...prefs.order.filter((key) => validKeys.has(key)),
      ...columns
        .map((column) => column.key)
        .filter((key) => !prefs.order.includes(key)),
    ],
    hidden: prefs.hidden.filter((key) => validKeys.has(key)),
  };
}

export function rebuildHeaderGroupsFromColumns(
  columns: HmcColumnDef[]
): HmcHeaderGroup[] {
  if (!columns.length) return [];

  const groups: HmcHeaderGroup[] = [];
  let index = 0;

  while (index < columns.length) {
    const start = columns[index];
    const groupName = start.group || start.label;
    let end = index + 1;

    while (
      end < columns.length &&
      (columns[end].group || columns[end].label) === groupName
    ) {
      end += 1;
    }

    const children = columns.slice(index, end);
    const colspan = children.length;

    groups.push({
      label: groupName,
      colspan,
      rowSpan: colspan > 1 ? 1 : 2,
      children,
    });

    index = end;
  }

  return groups;
}

export function applyColumnPreferences(
  allColumns: HmcColumnDef[],
  prefs?: HmcColumnPreference | null
) {
  const defaultPrefs = createDefaultPreferences(allColumns);

  if (!allColumns.length) {
    return {
      columns: [],
      headerGroups: [],
      preferences: mergePreferencesWithColumns(allColumns, prefs || defaultPrefs),
    };
  }

  const mergedPrefs = mergePreferencesWithColumns(
    allColumns,
    prefs || defaultPrefs
  );
  const hiddenSet = new Set(mergedPrefs.hidden);
  const columnMap = new Map(allColumns.map((column) => [column.key, column]));

  const visibleColumns = mergedPrefs.order
    .filter((key) => !hiddenSet.has(key))
    .map((key) => columnMap.get(key))
    .filter((column): column is HmcColumnDef => Boolean(column));

  return {
    columns: visibleColumns,
    headerGroups: rebuildHeaderGroupsFromColumns(visibleColumns),
    preferences: mergedPrefs,
  };
}

export function loadHmcColumnPreferences(
  view: HmcTableView
): HmcColumnPreference | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredSettings;
    return parsed[view] || null;
  } catch {
    return null;
  }
}

export function saveHmcColumnPreferences(
  view: HmcTableView,
  prefs: HmcColumnPreference
) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: StoredSettings = raw ? JSON.parse(raw) : {};
    parsed[view] = prefs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures.
  }
}

export function clearHmcColumnPreferences(view: HmcTableView) {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as StoredSettings;
    delete parsed[view];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures.
  }
}

export function getVisibleColumnCount(preferences: HmcColumnPreference) {
  const hiddenSet = new Set(preferences.hidden);
  return preferences.order.filter((key) => !hiddenSet.has(key)).length;
}
