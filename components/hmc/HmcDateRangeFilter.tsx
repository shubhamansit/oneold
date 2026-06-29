"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateToIso,
  formatHmcDateRangeSummary,
  isoToDate,
  type HmcDateOption,
} from "@/lib/hmcJobData";
import { cn } from "@/lib/utils";

type HmcDateRangeFilterProps = {
  availableDates: HmcDateOption[];
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  variant?: "field" | "button";
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function CalendarPopoverContent({
  pendingRange,
  setPendingRange,
  calendarMonth,
  calendarBounds,
  isDateSelectable,
  onCancel,
  onApply,
}: {
  pendingRange?: DateRange;
  setPendingRange: (range: DateRange | undefined) => void;
  calendarMonth: Date;
  calendarBounds: { from: Date; to: Date };
  isDateSelectable: (date: Date) => boolean;
  onCancel: () => void;
  onApply: () => void;
}) {
  const [displayMonth, setDisplayMonth] = useState(() =>
    startOfMonth(calendarMonth)
  );

  useEffect(() => {
    setDisplayMonth(startOfMonth(calendarMonth));
  }, [calendarMonth]);

  const secondMonth = useMemo(
    () => addMonths(displayMonth, 1),
    [displayMonth]
  );

  const minMonth = startOfMonth(calendarBounds.from);
  const maxFirstMonth = addMonths(startOfMonth(calendarBounds.to), -1);
  const canGoPrevious = displayMonth.getTime() > minMonth.getTime();
  const canGoNext = displayMonth.getTime() < maxFirstMonth.getTime();

  const navButtonClass = cn(
    buttonVariants({ variant: "outline" }),
    "h-7 w-7 shrink-0 bg-white p-0 opacity-80 hover:opacity-100"
  );

  return (
    <>
      <div className="px-3 pb-1 pt-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <button
            type="button"
            className={navButtonClass}
            disabled={!canGoPrevious}
            onClick={() => setDisplayMonth((current) => addMonths(current, -1))}
            aria-label="Previous months"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-8 md:gap-12">
            <p className="text-sm font-semibold text-gray-900">
              {formatMonthYear(displayMonth)}
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {formatMonthYear(secondMonth)}
            </p>
          </div>

          <button
            type="button"
            className={navButtonClass}
            disabled={!canGoNext}
            onClick={() => setDisplayMonth((current) => addMonths(current, 1))}
            aria-label="Next months"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Calendar
          mode="range"
          selected={pendingRange}
          onSelect={setPendingRange}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          startMonth={calendarBounds.from}
          endMonth={calendarBounds.to}
          showOutsideDays
          numberOfMonths={2}
          hideNavigation
          disabled={(date) => !isDateSelectable(date)}
          className="p-0"
          classNames={{
            months: "flex flex-col gap-4 md:flex-row md:gap-6",
            month: "min-w-[280px] space-y-2",
            month_caption: "hidden",
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday: "w-10 text-xs font-medium text-gray-500",
            week: "mt-1 flex w-full",
            day: "relative p-0 text-center text-sm",
            day_button: "h-10 w-10 rounded-md p-0 text-sm font-normal",
            range_start:
              "rounded-md bg-[#2b8cff] text-white hover:bg-[#2b8cff] hover:text-white",
            range_end:
              "rounded-md bg-[#2b8cff] text-white hover:bg-[#2b8cff] hover:text-white",
            range_middle: "rounded-none bg-[#dbeafe] text-[#1d4ed8]",
            selected:
              "rounded-md bg-[#2b8cff] text-white hover:bg-[#2b8cff] hover:text-white",
            today: "border border-[#2b8cff]/40 text-[#2b8cff]",
            outside: "text-gray-300 opacity-60",
            disabled: "text-gray-300 opacity-40",
          }}
          initialFocus
        />
      </div>
      <div className="flex flex-col gap-3 border-t bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-xs text-gray-600 sm:text-sm">
          {formatHmcDateRangeSummary(pendingRange?.from, pendingRange?.to)}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 bg-white px-4"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[#2b8cff] px-4 hover:bg-[#1a7ae6]"
            disabled={!pendingRange?.from}
            onClick={onApply}
          >
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}

export default function HmcDateRangeFilter({
  availableDates,
  dateRange,
  onDateRangeChange,
  variant = "button",
}: HmcDateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    dateRange
  );

  const availableIsoSet = useMemo(
    () => new Set(availableDates.map((item) => item.iso)),
    [availableDates]
  );

  const calendarBounds = useMemo(() => {
    if (!availableDates.length) {
      const today = new Date();
      return { from: today, to: today };
    }

    return {
      from: isoToDate(availableDates[0].iso),
      to: isoToDate(availableDates[availableDates.length - 1].iso),
    };
  }, [availableDates]);

  const calendarMonth = useMemo(() => {
    if (pendingRange?.from) {
      return pendingRange.from;
    }

    if (dateRange?.from) {
      return dateRange.from;
    }

    return calendarBounds.from;
  }, [calendarBounds.from, dateRange?.from, pendingRange?.from]);

  useEffect(() => {
    if (!calendarOpen) return;
    setPendingRange(dateRange);
  }, [calendarOpen, dateRange]);

  const isDateSelectable = (date: Date) =>
    availableIsoSet.has(dateToIso(date));

  const handleCalendarCancel = () => {
    setPendingRange(dateRange);
    setCalendarOpen(false);
  };

  const handleCalendarApply = () => {
    if (pendingRange?.from) {
      onDateRangeChange({
        from: pendingRange.from,
        to: pendingRange.to || pendingRange.from,
      });
    }

    setCalendarOpen(false);
  };

  const popoverContentProps = {
    pendingRange,
    setPendingRange,
    calendarMonth,
    calendarBounds,
    isDateSelectable,
    onCancel: handleCalendarCancel,
    onApply: handleCalendarApply,
  };

  if (variant === "field") {
    return (
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal>
        <div className="relative rounded-md border bg-white">
          <PopoverAnchor asChild>
            <span
              className="absolute left-0 top-3 h-6 w-px"
              aria-hidden="true"
            />
          </PopoverAnchor>
          <div className="px-3 py-2.5">
            <p className="mb-2 text-sm font-medium text-gray-900">Date range</p>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!availableDates.length}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2.5 py-2 text-left transition hover:bg-muted/20",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {formatHmcDateRangeSummary(dateRange?.from, dateRange?.to)}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={28}
          alignOffset={-8}
          collisionPadding={24}
          avoidCollisions
          className="z-[100] w-auto min-w-[min(100vw-2rem,620px)] border bg-white p-0 shadow-xl"
        >
          <CalendarPopoverContent {...popoverContentProps} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={!availableDates.length}
          className={cn(
            "h-10 min-w-[260px] justify-start gap-2 bg-white text-left text-sm font-normal",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {formatHmcDateRangeSummary(dateRange?.from, dateRange?.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-auto min-w-[min(100vw-2rem,620px)] p-0 shadow-lg"
        align="end"
        sideOffset={8}
      >
        <CalendarPopoverContent {...popoverContentProps} />
      </PopoverContent>
    </Popover>
  );
}
