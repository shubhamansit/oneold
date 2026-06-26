"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useHmcAuth } from "@/lib/useHmcAuth";
import HmcColumnSettingsDrawer from "@/components/hmc/HmcColumnSettingsDrawer";
import HmcGroupedTable from "@/components/hmc/HmcGroupedTable";
import { useHmcColumnSettings } from "@/lib/useHmcColumnSettings";
import { useHmcColumnWidths } from "@/lib/useHmcColumnWidths";
import {
  fetchHmcJobDetail,
  type HmcDetailData,
  type HmcMonthKey,
} from "@/lib/hmcJobData";
import { Button } from "@/components/ui/button";

export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAllowed, isChecking } = useHmcAuth();
  const [detail, setDetail] = useState<HmcDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const jobId = decodeURIComponent(String(params.jobId || ""));
  const month = (searchParams.get("month") || "march") as HmcMonthKey;
  const date = searchParams.get("date") || "";

  const {
    columns: visibleColumns,
    headerGroups: visibleHeaderGroups,
    preferences: columnPreferences,
    updatePreferences: updateColumnPreferences,
    resetPreferences: resetColumnPreferences,
    allColumns,
  } = useHmcColumnSettings("detail", detail?.columns || []);

  const visibleColumnKeys = useMemo(
    () => visibleColumns.map((column) => column.key),
    [visibleColumns]
  );

  const { getColumnWidth, setColumnWidth, setColumnWidths } = useHmcColumnWidths(
    "detail",
    visibleColumnKeys
  );

  useEffect(() => {
    if (!isAllowed || !jobId || !date) return;

    setIsLoading(true);
    setError("");

    fetchHmcJobDetail(month, date, jobId)
      .then((data) => setDetail(data))
      .catch(() => {
        setDetail(null);
        setError("Failed to load job detail data.");
      })
      .finally(() => setIsLoading(false));
  }, [isAllowed, jobId, month, date]);

  if (isChecking || !isAllowed) {
    return null;
  }

  const backHref = `/jobdetails?month=${month}&date=${date}`;

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden px-3 py-4 md:px-6">
      <div className="shrink-0 space-y-3 pb-4">
        <Button variant="ghost" size="sm" asChild className="w-fit px-0">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Details
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{jobId}</h1>
            <p className="text-sm text-muted-foreground">
              {detail?.date || date} · Checkpoint details
            </p>
          </div>

          <HmcColumnSettingsDrawer
            allColumns={allColumns}
            preferences={columnPreferences}
            onPreferencesChange={updateColumnPreferences}
            onReset={resetColumnPreferences}
            disabled={!detail}
          />
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-md border bg-white">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading checkpoint details...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : detail ? (
          <HmcGroupedTable
            headerGroups={visibleHeaderGroups}
            columns={visibleColumns}
            rows={detail.rows}
            getColumnWidth={getColumnWidth}
            onColumnWidthChange={setColumnWidth}
            onColumnWidthsChange={setColumnWidths}
          />
        ) : null}
      </div>
    </div>
  );
}
