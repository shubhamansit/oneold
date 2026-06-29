"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { useHmcAuth } from "@/lib/useHmcAuth";
import HmcColumnSettingsDrawer from "@/components/hmc/HmcColumnSettingsDrawer";
import HmcWardFilterDrawer, {
  type HmcFiltersApplyResult,
} from "@/components/hmc/HmcWardFilterDrawer";
import HmcGroupedTable from "@/components/hmc/HmcGroupedTable";
import { useHmcColumnSettings } from "@/lib/useHmcColumnSettings";
import { useHmcColumnWidths } from "@/lib/useHmcColumnWidths";
import {
  buildHmcSummaryFilterSearchParams,
  buildHmcSummaryPageHref,
  computeHmcSummaryTotals,
  fetchHmcCombinedSummaryForDates,
  fetchHmcIndex,
  filterHmcJobsByJobIds,
  formatHmcDateRangeSummary,
  getAllAvailableHmcDates,
  getHmcMonthForIso,
  getIsoDatesInRange,
  parseHmcSummaryFiltersFromSearchParams,
  type HmcMonthIndex,
  type HmcSummaryData,
} from "@/lib/hmcJobData";

export default function JobDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAllowed, isChecking } = useHmcAuth();
  const [monthIndex, setMonthIndex] = useState<HmcMonthIndex | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [summary, setSummary] = useState<HmcSummaryData | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const urlFilters = useMemo(
    () => parseHmcSummaryFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const availableDates = useMemo(
    () => (monthIndex ? getAllAvailableHmcDates(monthIndex) : []),
    [monthIndex]
  );

  const selectedIsoDates = useMemo(
    () => getIsoDatesInRange(availableDates, dateRange?.from, dateRange?.to),
    [availableDates, dateRange]
  );

  const appliedDateRangeLabel = useMemo(() => {
    if (!filtersApplied || !dateRange?.from) {
      return null;
    }

    return formatHmcDateRangeSummary(dateRange.from, dateRange.to);
  }, [dateRange, filtersApplied]);

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

  const filteredJobs = useMemo(() => {
    if (!summary) return [];
    return filterHmcJobsByJobIds(summary.jobs, appliedJobIds);
  }, [appliedJobIds, summary]);

  const summaryTotals = useMemo(
    () =>
      summary ? computeHmcSummaryTotals(filteredJobs, allColumns) : undefined,
    [allColumns, filteredJobs, summary]
  );

  useEffect(() => {
    if (!isAllowed) return;

    fetchHmcIndex()
      .then((index) => {
        setMonthIndex(index);
      })
      .catch(() => setError("Failed to load available dates."));
  }, [isAllowed]);

  useEffect(() => {
    if (urlFilters.filtersApplied && urlFilters.dateRange) {
      setDateRange(urlFilters.dateRange);
      setAppliedJobIds(urlFilters.jobIds);
      setFiltersApplied(true);
      return;
    }

    setDateRange(undefined);
    setAppliedJobIds(null);
    setFiltersApplied(false);
  }, [urlFilters]);

  useEffect(() => {
    if (!isAllowed || !monthIndex) {
      return;
    }

    if (!filtersApplied || !selectedIsoDates.length) {
      setSummary(null);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    fetchHmcCombinedSummaryForDates(monthIndex, selectedIsoDates)
      .then((data) => {
        setSummary(data);
      })
      .catch(() => {
        setSummary(null);
        setError("No job details found for the selected date range.");
      })
      .finally(() => setIsLoading(false));
  }, [filtersApplied, isAllowed, monthIndex, selectedIsoDates]);

  const handleFiltersApply = ({ jobIds, dateRange: nextDateRange }: HmcFiltersApplyResult) => {
    if (!nextDateRange?.from) return;

    const params = buildHmcSummaryFilterSearchParams(
      { from: nextDateRange.from, to: nextDateRange.to ?? nextDateRange.from },
      jobIds
    );
    router.replace(`/jobdetails?${params.toString()}`);
  };

  const handleFiltersReset = () => {
    router.replace("/jobdetails");
  };

  const handleJobClick = (rowIndex: number) => {
    const job = filteredJobs[rowIndex];
    if (!job || !monthIndex || !filtersApplied || !dateRange?.from) return;

    const jobDate = job._hmcIsoDate;
    if (!jobDate) return;

    const month = getHmcMonthForIso(jobDate, monthIndex);
    if (!month) return;

    const params = buildHmcSummaryFilterSearchParams(
      { from: dateRange.from, to: dateRange.to ?? dateRange.from },
      appliedJobIds
    );
    params.set("month", month);
    params.set("date", jobDate);

    router.push(
      `/jobdetails/${encodeURIComponent(job.id)}?${params.toString()}`
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
            {appliedDateRangeLabel ? (
              <p className="text-sm text-muted-foreground">{appliedDateRangeLabel}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <HmcWardFilterDrawer
              monthIndex={monthIndex}
              availableDates={availableDates}
              dateRange={dateRange}
              appliedJobIds={appliedJobIds}
              onApply={handleFiltersApply}
              onReset={handleFiltersReset}
              disabled={!availableDates.length}
              autoOpenOnMount={!urlFilters.filtersApplied}
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

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading job details...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : !filtersApplied ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select filters and click Apply to view job details.
          </div>
        ) : summary && !filteredJobs.length ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No jobs found for the selected filters.
          </div>
        ) : summary ? (
          <HmcGroupedTable
            headerGroups={visibleHeaderGroups}
            columns={visibleColumns}
            rows={filteredJobs}
            summaryTotals={summaryTotals}
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
