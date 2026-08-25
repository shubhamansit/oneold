"use client";

import { useEffect, useMemo, useState } from "react";
import SelectBox from "react-select";
import { X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import "react-day-picker/dist/style.css";
import "@/styles/calendar.css";
import {
  parseMorbiStartDate,
  type MorbiRouteDetailRow,
} from "@/lib/morbiTypes";

export type MorbiFilterOption = { value: string; label: string };

export type MorbiFilterFormData = {
  town: MorbiFilterOption;
  zone: MorbiFilterOption;
  ward: MorbiFilterOption;
  routeName: MorbiFilterOption;
  status: MorbiFilterOption;
};

export const MORBI_FILTER_ALL: MorbiFilterOption = {
  value: "All",
  label: "All",
};

export const EMPTY_MORBI_FILTERS: MorbiFilterFormData = {
  town: MORBI_FILTER_ALL,
  zone: MORBI_FILTER_ALL,
  ward: MORBI_FILTER_ALL,
  routeName: MORBI_FILTER_ALL,
  status: MORBI_FILTER_ALL,
};

type Props = {
  allData: MorbiRouteDetailRow[];
  /** Currently applied filters (table uses these). */
  appliedFormData: MorbiFilterFormData;
  appliedDateRange?: DateRange;
  /** Commit draft filters to the table. */
  onApply: (formData: MorbiFilterFormData, dateRange: DateRange | undefined) => void;
  onClose: () => void;
  open: boolean;
};

function uniqueOptions(
  rows: MorbiRouteDetailRow[],
  key: keyof MorbiRouteDetailRow
): MorbiFilterOption[] {
  const values = [
    ...new Set(
      rows.map((r) => String(r[key] ?? "").trim()).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return [MORBI_FILTER_ALL, ...values.map((v) => ({ value: v, label: v }))];
}

function earliestDataMonth(rows: MorbiRouteDetailRow[]): Date {
  let min: Date | null = null;
  for (const row of rows) {
    const d = parseMorbiStartDate(row["Start Date"]);
    if (!d) continue;
    if (!min || d < min) min = d;
  }
  return min ?? new Date();
}

export default function MorbiFiltersForm({
  allData,
  appliedFormData,
  appliedDateRange,
  onApply,
  onClose,
  open,
}: Props) {
  const [draftForm, setDraftForm] =
    useState<MorbiFilterFormData>(appliedFormData);
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>(
    appliedDateRange
  );

  // Sync draft from applied values whenever the drawer opens
  useEffect(() => {
    if (!open) return;
    setDraftForm(appliedFormData);
    setDraftDateRange(appliedDateRange);
  }, [open, appliedFormData, appliedDateRange]);

  const defaultMonth = useMemo(
    () => draftDateRange?.from ?? earliestDataMonth(allData),
    [draftDateRange?.from, allData]
  );

  const townOptions = useMemo(() => uniqueOptions(allData, "Town"), [allData]);
  const zoneOptions = useMemo(() => {
    const scoped =
      draftForm.town.value === "All"
        ? allData
        : allData.filter((r) => r.Town === draftForm.town.value);
    return uniqueOptions(scoped, "Zone");
  }, [allData, draftForm.town.value]);
  const wardOptions = useMemo(() => {
    let scoped = allData;
    if (draftForm.town.value !== "All") {
      scoped = scoped.filter((r) => r.Town === draftForm.town.value);
    }
    if (draftForm.zone.value !== "All") {
      scoped = scoped.filter((r) => r.Zone === draftForm.zone.value);
    }
    return uniqueOptions(scoped, "Ward");
  }, [allData, draftForm.town.value, draftForm.zone.value]);
  const routeOptions = useMemo(() => {
    let scoped = allData;
    if (draftForm.town.value !== "All") {
      scoped = scoped.filter((r) => r.Town === draftForm.town.value);
    }
    if (draftForm.zone.value !== "All") {
      scoped = scoped.filter((r) => r.Zone === draftForm.zone.value);
    }
    if (draftForm.ward.value !== "All") {
      scoped = scoped.filter((r) => r.Ward === draftForm.ward.value);
    }
    return uniqueOptions(scoped, "Route Name");
  }, [allData, draftForm.town.value, draftForm.zone.value, draftForm.ward.value]);
  const statusOptions = useMemo(
    () => uniqueOptions(allData, "Status"),
    [allData]
  );

  const handleChange = (selected: unknown, meta: { name?: string }) => {
    const name = meta.name as keyof MorbiFilterFormData | undefined;
    if (!name || !selected || Array.isArray(selected)) return;
    const option = selected as MorbiFilterOption;

    if (name === "town") {
      setDraftForm({
        town: option,
        zone: MORBI_FILTER_ALL,
        ward: MORBI_FILTER_ALL,
        routeName: MORBI_FILTER_ALL,
        status: draftForm.status,
      });
      return;
    }
    if (name === "zone") {
      setDraftForm({
        ...draftForm,
        zone: option,
        ward: MORBI_FILTER_ALL,
        routeName: MORBI_FILTER_ALL,
      });
      return;
    }
    if (name === "ward") {
      setDraftForm({
        ...draftForm,
        ward: option,
        routeName: MORBI_FILTER_ALL,
      });
      return;
    }
    setDraftForm({ ...draftForm, [name]: option });
  };

  const handleApply = () => {
    onApply(draftForm, draftDateRange);
    onClose();
  };

  const handleReset = () => {
    setDraftForm(EMPTY_MORBI_FILTERS);
    setDraftDateRange(undefined);
    onApply(EMPTY_MORBI_FILTERS, undefined);
    onClose();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close filters</span>
        </Button>
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex w-72 flex-col gap-4">
          <Label>Town</Label>
          <SelectBox
            instanceId="morbi-town"
            name="town"
            options={townOptions}
            value={draftForm.town}
            onChange={handleChange}
            isClearable={false}
          />
          <Label>Zone</Label>
          <SelectBox
            instanceId="morbi-zone"
            name="zone"
            options={zoneOptions}
            value={draftForm.zone}
            onChange={handleChange}
            isClearable={false}
          />
          <Label>Ward</Label>
          <SelectBox
            instanceId="morbi-ward"
            name="ward"
            options={wardOptions}
            value={draftForm.ward}
            onChange={handleChange}
            isClearable={false}
          />
          <Label>Route Name</Label>
          <SelectBox
            instanceId="morbi-route"
            name="routeName"
            options={routeOptions}
            value={draftForm.routeName}
            onChange={handleChange}
            isClearable={false}
          />
          <Label>Status</Label>
          <SelectBox
            instanceId="morbi-status"
            name="status"
            options={statusOptions}
            value={draftForm.status}
            onChange={handleChange}
            isClearable={false}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <Label>Date Range</Label>
          <p className="text-xs text-muted-foreground">
            Dates in data use DD-MM-YYYY (e.g. 11-06-2026 = 11 June 2026).
          </p>
          <Calendar
            key={`morbi-cal-${open}-${defaultMonth.getFullYear()}-${defaultMonth.getMonth()}`}
            mode="range"
            selected={draftDateRange}
            onSelect={setDraftDateRange}
            defaultMonth={defaultMonth}
            className="rounded-md border"
            numberOfMonths={1}
          />
          <div className="flex gap-2">
            <Button className="w-full bg-[#DB4848]" onClick={handleApply}>
              Apply
            </Button>
            <Button variant="outline" className="w-full" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
