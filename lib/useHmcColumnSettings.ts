"use client";

import { useEffect, useMemo, useState } from "react";
import type { HmcColumnDef } from "@/lib/hmcJobData";
import {
  applyColumnPreferences,
  clearHmcColumnPreferences,
  createDefaultPreferences,
  loadHmcColumnPreferences,
  saveHmcColumnPreferences,
  type HmcColumnPreference,
  type HmcTableView,
} from "@/lib/hmcColumnSettings";

export function useHmcColumnSettings(
  view: HmcTableView,
  allColumns: HmcColumnDef[]
) {
  const [preferences, setPreferences] = useState<HmcColumnPreference | null>(
    null
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setPreferences(loadHmcColumnPreferences(view));
    setIsReady(true);
  }, [view]);

  const defaultPreferences = useMemo(
    () => createDefaultPreferences(allColumns),
    [allColumns]
  );

  const applied = useMemo(
    () =>
      applyColumnPreferences(
        allColumns,
        preferences || defaultPreferences
      ),
    [allColumns, preferences, defaultPreferences]
  );

  const updatePreferences = (next: HmcColumnPreference) => {
    const merged =
      applyColumnPreferences(allColumns, next).preferences ?? defaultPreferences;
    setPreferences(merged);
    saveHmcColumnPreferences(view, merged);
  };

  const resetPreferences = () => {
    const defaults = createDefaultPreferences(allColumns);
    setPreferences(defaults);
    clearHmcColumnPreferences(view);
    saveHmcColumnPreferences(view, defaults);
  };

  return {
    columns: applied.columns,
    headerGroups: applied.headerGroups,
    preferences: applied.preferences ?? defaultPreferences,
    updatePreferences,
    resetPreferences,
    allColumns,
    isReady,
  };
}
