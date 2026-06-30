"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";
import { DateRange } from "react-day-picker";
import HmcDateRangeFilter from "@/components/hmc/HmcDateRangeFilter";
import {
  buildHmcWardJobGroups,
  fetchHmcCombinedSummaryForDates,
  getAllHmcJobFilterKeys,
  getIsoDatesInRange,
  type HmcDateOption,
  type HmcMonthIndex,
  type HmcWardJobGroup,
} from "@/lib/hmcJobData";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type HmcFiltersApplyResult = {
  jobIds: string[] | null;
  dateRange?: DateRange;
};

type HmcWardFilterDrawerProps = {
  monthIndex: HmcMonthIndex | null;
  availableDates: HmcDateOption[];
  dateRange?: DateRange;
  appliedJobIds: string[] | null;
  onApply: (filters: HmcFiltersApplyResult) => void;
  onReset?: () => void;
  disabled?: boolean;
  autoOpenOnMount?: boolean;
};

function getWardSelectionState(
  ward: HmcWardJobGroup,
  selected: Set<string>
) {
  const selectedCount = ward.jobs.filter((job) => selected.has(job.key)).length;

  if (!selectedCount) return "none";
  if (selectedCount === ward.jobs.length) return "all";
  return "some";
}

function getAllSelectionState(allJobIds: string[], selected: Set<string>) {
  if (!allJobIds.length) return "none";

  const selectedCount = allJobIds.filter((id) => selected.has(id)).length;

  if (!selectedCount) return "none";
  if (selectedCount === allJobIds.length) return "all";
  return "some";
}

export default function HmcWardFilterDrawer({
  monthIndex,
  availableDates,
  dateRange,
  appliedJobIds,
  onApply,
  onReset,
  disabled = false,
  autoOpenOnMount = false,
}: HmcWardFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [draftJobIds, setDraftJobIds] = useState<string[]>([]);
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>();
  const [draftWardGroups, setDraftWardGroups] = useState<HmcWardJobGroup[]>([]);
  const [isWardGroupsLoading, setIsWardGroupsLoading] = useState(false);
  const [wardGroupsError, setWardGroupsError] = useState("");
  const [expandedWards, setExpandedWards] = useState<Record<string, boolean>>(
    {}
  );

  const wardFilterIsoDates = useMemo(() => {
    if (!availableDates.length) return [];

    const selectedDates = getIsoDatesInRange(
      availableDates,
      draftDateRange?.from,
      draftDateRange?.to
    );

    if (selectedDates.length) {
      return selectedDates;
    }

    return availableDates.map((item) => item.iso);
  }, [availableDates, draftDateRange]);

  const allJobIds = useMemo(
    () => getAllHmcJobFilterKeys(draftWardGroups),
    [draftWardGroups]
  );

  const isJobFilterActive =
    appliedJobIds !== null && appliedJobIds.length > 0;

  const isDateFilterActive = Boolean(dateRange?.from);

  const isFilterActive = isJobFilterActive || isDateFilterActive;

  useEffect(() => {
    if (
      autoOpenOnMount &&
      !disabled &&
      availableDates.length > 0 &&
      !hasAutoOpened
    ) {
      setOpen(true);
      setHasAutoOpened(true);
    }
  }, [autoOpenOnMount, availableDates.length, disabled, hasAutoOpened]);

  useEffect(() => {
    if (!open) return;

    setDraftJobIds(appliedJobIds ?? []);
    setDraftDateRange(dateRange);
  }, [appliedJobIds, dateRange, open]);

  useEffect(() => {
    if (!open || !monthIndex || !wardFilterIsoDates.length) {
      return;
    }

    let cancelled = false;

    setIsWardGroupsLoading(true);
    setWardGroupsError("");

    fetchHmcCombinedSummaryForDates(monthIndex, wardFilterIsoDates)
      .then((data) => {
        if (cancelled) return;

        const groups = buildHmcWardJobGroups(data.jobs);
        const validJobIds = new Set(getAllHmcJobFilterKeys(groups));

        setDraftWardGroups(groups);
        setDraftJobIds((current) => current.filter((id) => validJobIds.has(id)));
        setExpandedWards(
          Object.fromEntries(groups.map((ward) => [ward.key, true]))
        );
      })
      .catch(() => {
        if (cancelled) return;

        setDraftWardGroups([]);
        setWardGroupsError("Failed to load wards and jobs.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsWardGroupsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthIndex, open, wardFilterIsoDates]);

  const draftSet = new Set(draftJobIds);
  const allSelectionState = getAllSelectionState(allJobIds, draftSet);

  const toggleJob = (jobKey: string, checked: boolean) => {
    setDraftJobIds((current) => {
      if (checked) {
        return current.includes(jobKey) ? current : [...current, jobKey];
      }

      return current.filter((key) => key !== jobKey);
    });
  };

  const toggleWard = (ward: HmcWardJobGroup, checked: boolean) => {
    const wardJobKeys = ward.jobs.map((job) => job.key);

    setDraftJobIds((current) => {
      const next = new Set(current);

      if (checked) {
        wardJobKeys.forEach((key) => next.add(key));
      } else {
        wardJobKeys.forEach((key) => next.delete(key));
      }

      return [...next];
    });
  };

  const toggleAllJobs = (checked: boolean) => {
    setDraftJobIds(checked ? [...allJobIds] : []);
  };

  const toggleWardExpanded = (wardKey: string) => {
    setExpandedWards((current) => ({
      ...current,
      [wardKey]: !current[wardKey],
    }));
  };

  const handleReset = () => {
    setDraftJobIds([]);
    setDraftDateRange(undefined);
    setDraftWardGroups([]);
    setWardGroupsError("");
    onReset?.();
  };

  const handleCancel = () => {
    setDraftJobIds(appliedJobIds ?? []);
    setDraftDateRange(dateRange);
    setOpen(false);
  };

  const handleApply = () => {
    if (!draftDateRange?.from) return;

    const nextJobIds =
      !draftJobIds.length || draftJobIds.length === allJobIds.length
        ? null
        : draftJobIds;

    onApply({
      jobIds: nextJobIds,
      dateRange: draftDateRange,
    });

    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || !availableDates.length}
          title="Filters"
          className={cn(
            "relative h-10 w-10 bg-white",
            isFilterActive && "border-[#DB4848] text-[#DB4848]"
          )}
        >
          <Filter className="h-4 w-4" />
          {isFilterActive ? (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#DB4848]" />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          <HmcDateRangeFilter
            variant="field"
            availableDates={availableDates}
            dateRange={draftDateRange}
            onDateRangeChange={setDraftDateRange}
          />

          <div>
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-900">Ward wise jobs</p>
              <p className="text-xs text-muted-foreground">
                {draftSet.size} of {allJobIds.length} jobs selected
              </p>
            </div>

            {isWardGroupsLoading ? (
              <p className="rounded-md border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                Loading wards and jobs...
              </p>
            ) : wardGroupsError ? (
              <p className="rounded-md border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                {wardGroupsError}
              </p>
            ) : !draftWardGroups.length ? (
              <p className="rounded-md border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                No jobs found for the selected dates.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5">
                  <Checkbox
                    checked={
                      allSelectionState === "all"
                        ? true
                        : allSelectionState === "some"
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) => toggleAllJobs(checked === true)}
                    aria-label="Select all wards and jobs"
                  />
                  <span className="text-sm font-medium">Select all</span>
                </label>

                {draftWardGroups.map((ward) => {
                  const wardState = getWardSelectionState(ward, draftSet);
                  const isExpanded = expandedWards[ward.key] ?? true;

                  return (
                    <div
                      key={ward.key}
                      className="overflow-hidden rounded-md border bg-white"
                    >
                      <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2.5">
                        <Checkbox
                          checked={
                            wardState === "all"
                              ? true
                              : wardState === "some"
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) =>
                            toggleWard(ward, checked === true)
                          }
                          aria-label={`Toggle all jobs in ${ward.label}`}
                        />
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                          onClick={() => toggleWardExpanded(ward.key)}
                        >
                          <span className="truncate text-sm font-medium">
                            {ward.label}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="flex flex-col gap-1 px-3 py-2">
                          {ward.jobs.map((job) => (
                            <label
                              key={job.key}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/30"
                            >
                              <Checkbox
                                checked={draftSet.has(job.key)}
                                onCheckedChange={(checked) =>
                                  toggleJob(job.key, checked === true)
                                }
                                aria-label={`Toggle ${job.label}`}
                              />
                              <span className="truncate text-sm">{job.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1 px-2"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#DB4848] hover:bg-[#c93c3c]"
              onClick={handleApply}
              disabled={!draftDateRange?.from}
            >
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
