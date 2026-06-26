"use client";

import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateToIso,
  getMonthCalendarBounds,
  isDateInMonthTab,
  isoToDate,
  type HmcDateOption,
  type HmcMonthKey,
} from "@/lib/hmcJobData";
import { cn } from "@/lib/utils";

type HmcDateRangeFilterProps = {
  month: HmcMonthKey;
  monthLabel: string;
  availableDates: HmcDateOption[];
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
};

function formatDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatRangeLabel(monthLabel: string, dateRange?: DateRange) {
  if (!dateRange?.from) {
    return `${monthLabel}: Select dates`;
  }

  if (!dateRange.to || dateToIso(dateRange.from) === dateToIso(dateRange.to)) {
    return `${monthLabel}: ${formatDisplayDate(dateRange.from)}`;
  }

  return `${monthLabel}: ${formatDisplayDate(dateRange.from)} - ${formatDisplayDate(dateRange.to)}`;
}

export default function HmcDateRangeFilter({
  month,
  monthLabel,
  availableDates,
  dateRange,
  onDateRangeChange,
}: HmcDateRangeFilterProps) {
  const availableIsoSet = useMemo(
    () => new Set(availableDates.map((item) => item.iso)),
    [availableDates]
  );

  const monthBounds = useMemo(() => getMonthCalendarBounds(month), [month]);

  const calendarMonth = useMemo(() => {
    if (dateRange?.from && isDateInMonthTab(dateRange.from, month)) {
      return dateRange.from;
    }

    const firstIso = availableDates[0]?.iso;
    return firstIso ? isoToDate(firstIso) : monthBounds.from;
  }, [availableDates, dateRange?.from, month, monthBounds.from]);

  const isDateSelectable = (date: Date) =>
    isDateInMonthTab(date, month) && availableIsoSet.has(dateToIso(date));

  return (
    <Popover>
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
          {formatRangeLabel(monthLabel, dateRange)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          key={month}
          mode="range"
          selected={dateRange}
          onSelect={onDateRangeChange}
          defaultMonth={calendarMonth}
          startMonth={monthBounds.from}
          endMonth={monthBounds.to}
          showOutsideDays={false}
          numberOfMonths={1}
          disabled={(date) => !isDateSelectable(date)}
          hidden={{ before: monthBounds.from, after: monthBounds.to }}
          classNames={{
            nav: "hidden",
            month_caption: "mb-2 flex justify-center",
            caption_label: "text-sm font-semibold",
          }}
          initialFocus
        />
        {!availableDates.length ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            No dates available for {monthLabel}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
