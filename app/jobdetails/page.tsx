"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { useHmcAuth } from "@/lib/useHmcAuth";
import HmcColumnSettingsDrawer from "@/components/hmc/HmcColumnSettingsDrawer";
import HmcGroupedTable from "@/components/hmc/HmcGroupedTable";
import HmcDateRangeFilter from "@/components/hmc/HmcDateRangeFilter";
import { useHmcColumnSettings } from "@/lib/useHmcColumnSettings";
import { useHmcColumnWidths } from "@/lib/useHmcColumnWidths";
import {
  fetchHmcCombinedSummary,
  fetchHmcIndex,
  getIsoDatesInRange,
  HMC_MONTHS,
  isoToDate,
  type HmcMonthIndex,
  type HmcMonthKey,
  type HmcSummaryData,
} from "@/lib/hmcJobData";

type DateRangesByMonth = Partial<Record<HmcMonthKey, DateRange>>;

function buildInitialRange(
  availableDates: { iso: string }[],
  fromParam?: string | null,
  toParam?: string | null,
  legacyDateParam?: string | null
): DateRange | undefined {
  if (!availableDates.length) return undefined;

  const availableSet = new Set(availableDates.map((item) => item.iso));
  const startIso =
    fromParam && availableSet.has(fromParam)
      ? fromParam
      : legacyDateParam && availableSet.has(legacyDateParam)
        ? legacyDateParam
        : availableDates[0].iso;
  const endIso =
    toParam && availableSet.has(toParam)
      ? toParam
      : legacyDateParam && availableSet.has(legacyDateParam)
        ? legacyDateParam
        : startIso;

  const [fromIso, toIso] = startIso <= endIso ? [startIso, endIso] : [endIso, startIso];

  return {
    from: isoToDate(fromIso),
    to: isoToDate(toIso),
  };
}

function buildDefaultRanges(index: HmcMonthIndex): DateRangesByMonth {
  const ranges: DateRangesByMonth = {};

  for (const month of HMC_MONTHS) {
    const dates = index[month.key]?.dates || [];
    if (dates.length) {
      ranges[month.key] = buildInitialRange(dates);
    }
  }

  return ranges;
}

export default function JobDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAllowed, isChecking } = useHmcAuth();
  const [monthIndex, setMonthIndex] = useState<HmcMonthIndex | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<HmcMonthKey>(
    (searchParams.get("month") as HmcMonthKey) || "march"
  );
  const [dateRangesByMonth, setDateRangesByMonth] = useState<DateRangesByMonth>({});
  const [summary, setSummary] = useState<HmcSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const availableDates = useMemo(() => {
    if (!monthIndex) return [];
    return monthIndex[selectedMonth]?.dates || [];
  }, [monthIndex, selectedMonth]);

  const dateRange = dateRangesByMonth[selectedMonth];

  const selectedIsoDates = useMemo(
    () => getIsoDatesInRange(availableDates, dateRange?.from, dateRange?.to),
    [availableDates, dateRange]
  );

  const selectedMonthLabel =
    HMC_MONTHS.find((month) => month.key === selectedMonth)?.label || "Month";

  const {
    columns: visibleColumns,
    headerGroups: visibleHeaderGroups,
    preferences: columnPreferences,
    updatePreferences: updateColumnPreferences,
    resetPreferences: resetColumnPreferences,
    allColumns,
  } = useHmcColumnSettings("summary", summary?.columns || []);

  const visibleColumnKeys = useMemo(
    () => visibleColumns.map((column) => column.key),
    [visibleColumns]
  );

  const { getColumnWidth, setColumnWidth, setColumnWidths } = useHmcColumnWidths(
    "summary",
    visibleColumnKeys
  );

  useEffect(() => {
    if (!isAllowed) return;

    fetchHmcIndex()
      .then((index) => {
        setMonthIndex(index);

        const month = (searchParams.get("month") as HmcMonthKey) || "march";
        const dates = index[month]?.dates || [];
        const urlRange = buildInitialRange(
          dates,
          searchParams.get("from"),
          searchParams.get("to"),
          searchParams.get("date")
        );

        setSelectedMonth(month);
        setDateRangesByMonth({
          ...buildDefaultRanges(index),
          ...(urlRange ? { [month]: urlRange } : {}),
        });
      })
      .catch(() => setError("Failed to load available dates."));
  }, [isAllowed, searchParams]);

  useEffect(() => {
    if (!monthIndex) return;

    setDateRangesByMonth((current) => {
      const next = { ...current };

      for (const month of HMC_MONTHS) {
        const dates = monthIndex[month.key]?.dates || [];
        if (!dates.length) {
          delete next[month.key];
          continue;
        }

        const existing = next[month.key];
        const validExisting =
          existing?.from &&
          getIsoDatesInRange(dates, existing.from, existing.to || existing.from).length > 0;

        if (!validExisting) {
          next[month.key] = buildInitialRange(dates);
        }
      }

      return next;
    });
  }, [monthIndex]);

  useEffect(() => {
    if (!isAllowed || !selectedMonth || !selectedIsoDates.length) {
      if (isAllowed && selectedMonth && !selectedIsoDates.length) {
        setSummary(null);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError("");

    fetchHmcCombinedSummary(selectedMonth, selectedIsoDates)
      .then((data) => setSummary(data))
      .catch(() => {
        setSummary(null);
        setError("No job details found for the selected date range.");
      })
      .finally(() => setIsLoading(false));
  }, [isAllowed, selectedMonth, selectedIsoDates]);

  const handleMonthChange = (month: HmcMonthKey) => {
    setSelectedMonth(month);
    setError("");

    const dates = monthIndex?.[month]?.dates || [];
    if (!dates.length) {
      setSummary(null);
      return;
    }

    setDateRangesByMonth((current) => {
      if (current[month]?.from) {
        return current;
      }

      return {
        ...current,
        [month]: buildInitialRange(dates),
      };
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRangesByMonth((current) => ({
      ...current,
      [selectedMonth]: range,
    }));
  };

  const handleJobClick = (rowIndex: number) => {
    const job = summary?.jobs[rowIndex];
    if (!job) return;

    const jobDate = job._hmcIsoDate || selectedIsoDates[0];
    if (!jobDate) return;

    router.push(
      `/jobdetails/${encodeURIComponent(job.id)}?month=${selectedMonth}&date=${jobDate}`
    );
  };

  if (isChecking || !isAllowed) {
    return null;
  }

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden px-3 py-4 md:px-6">
      <div className="shrink-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Job Detail Summary</h1>
            {summary?.reportRange ? (
              <p className="text-sm text-muted-foreground">
                {selectedMonthLabel} · {summary.reportRange}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap gap-2">
              {HMC_MONTHS.map((month) => (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => handleMonthChange(month.key)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                    selectedMonth === month.key
                      ? "bg-[#DB4848] text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {month.label}
                </button>
              ))}
            </div>

            <HmcDateRangeFilter
              key={selectedMonth}
              month={selectedMonth}
              monthLabel={selectedMonthLabel}
              availableDates={availableDates}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />

            <HmcColumnSettingsDrawer
              allColumns={allColumns}
              preferences={columnPreferences}
              onPreferencesChange={updateColumnPreferences}
              onReset={resetColumnPreferences}
              disabled={!summary}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-md border bg-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading job details...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : summary ? (
          <HmcGroupedTable
            headerGroups={visibleHeaderGroups}
            columns={visibleColumns}
            rows={summary.jobs}
            getSrNo={(rowIndex) => summary.jobs[rowIndex]?.srNo ?? rowIndex + 1}
            onRowClick={handleJobClick}
            getColumnWidth={getColumnWidth}
            onColumnWidthChange={setColumnWidth}
            onColumnWidthsChange={setColumnWidths}
          />
        ) : null}
      </div>
    </div>
  );
}
