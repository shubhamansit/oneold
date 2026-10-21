"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SelectBox from "react-select";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import ExportExcel from "@/components/ExportExcel";
import "react-day-picker/dist/style.css";
import "../../styles/calendar.css";
import type { JobData } from "@/components/ExportExcel";

interface Option {
  value: string;
  label: string;
}

interface FormData {
  company: Option[];
  branch: Option[];
  town: Option;
  zone: Option;
  ward: Option;
}

interface Props {
  formData: FormData;
  onClose: () => void;
  onCheckedItemsChange: (items: string[]) => void;
  onFormDataChange: (newFormData: FormData) => void;
  dateRange?: DateRange;
  onDateRangeChange: (date: DateRange | undefined) => void;
  filteredData: JobData[] | undefined;
  jobNames: string[];
  checkedItems: string[];
}

const companyOptions = [{ value: "KARNI", label: "KARNI" }];
const branchOptions = [{ value: "KARNI", label: "KARNI" }];
const townOptions = [{ value: "BARDOLI", label: "BARDOLI" }];
const zoneOptions = [{ value: "All", label: "All" }, { value: "BARDOLI", label: "BARDOLI" }];
const wardOptions = [
  { value: "All", label: "All" },
  { value: "TALUKA PANCHAYAT", label: "TALUKA PANCHAYAT" },
];

export default function BardoliFiltersForm({
  formData,
  onClose,
  onCheckedItemsChange,
  onFormDataChange,
  dateRange,
  onDateRangeChange,
  filteredData,
  jobNames,
  checkedItems,
}: Props) {
  const [isXlS, setIsXLS] = useState(false);

  const toggleRoute = (name: string, checked: boolean) => {
    onCheckedItemsChange(
      checked ? [...checkedItems, name] : checkedItems.filter((n) => n !== name)
    );
  };

  return (
    <div className="h-full flex overflow-y-scroll flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close filters</span>
        </Button>
      </div>
      <div className="flex gap-4 p-4">
        <div className="flex flex-col w-72 gap-4">
          <Label htmlFor="company">Company</Label>
          <SelectBox
            instanceId="bardoli-filter-company"
            isMulti
            name="company"
            options={companyOptions}
            value={formData.company}
            onChange={(opts: any) =>
              onFormDataChange({ ...formData, company: opts || [] })
            }
          />
          <Label htmlFor="branch">Branch</Label>
          <SelectBox
            instanceId="bardoli-filter-branch"
            isMulti
            name="branch"
            options={branchOptions}
            value={formData.branch}
            onChange={(opts: any) =>
              onFormDataChange({ ...formData, branch: opts || [] })
            }
          />
          <Label htmlFor="town">Town</Label>
          <SelectBox
            instanceId="bardoli-filter-town"
            name="town"
            options={townOptions}
            value={formData.town}
            isClearable={false}
            onChange={(opt: any) =>
              opt && onFormDataChange({ ...formData, town: opt })
            }
          />
          <Label htmlFor="zone">Zone</Label>
          <SelectBox
            instanceId="bardoli-filter-zone"
            name="zone"
            options={zoneOptions}
            value={formData.zone}
            isClearable={false}
            onChange={(opt: any) =>
              opt &&
              onFormDataChange({
                ...formData,
                zone: opt,
                ward: { value: "All", label: "All" },
              })
            }
          />
          <Label htmlFor="ward">Ward</Label>
          <SelectBox
            instanceId="bardoli-filter-ward"
            name="ward"
            options={wardOptions}
            value={formData.ward}
            isClearable={false}
            onChange={(opt: any) =>
              opt && onFormDataChange({ ...formData, ward: opt })
            }
          />
        </div>
        <div className="flex-grow flex flex-col p-4 gap-4">
          <Label>Date Range</Label>
          {dateRange && (
            <div className="text-xs text-gray-500 mb-2">
              Selected: {dateRange.from?.toLocaleDateString()} -{" "}
              {dateRange.to?.toLocaleDateString()}
            </div>
          )}
          <div className="border rounded-md p-2 calendar-container">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={1}
              showOutsideDays={true}
              showWeekNumber={false}
            />
          </div>

          <Label>Routes</Label>
          <div className="max-h-64 overflow-y-auto rounded-md border p-2">
            {jobNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 py-1 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedItems.includes(name)}
                  onChange={(e) => toggleRoute(name, e.target.checked)}
                />
                {name}
              </label>
            ))}
          </div>

          <div className="w-full flex items-center gap-2 relative">
            <Button
              type="submit"
              className="w-1/2 bg-[#DB4848]"
              onClick={onClose}
            >
              Apply
            </Button>
            <Button
              className="w-1/2 bg-[#DB4848]"
              onMouseMove={() => setIsXLS(true)}
            >
              XLS
            </Button>
            {isXlS && (
              <div
                className="xlsx bg-[#DB4848] text-white transition-all ease-in-out absolute -top-24 right-0 flex flex-col justify-start p-2 shadow-lg rounded-md overflow-hidden z-50"
                onMouseLeave={() => setIsXLS(false)}
              >
                <ExportExcel data={filteredData || []} exportMode="summary" />
                <ExportExcel data={filteredData || []} exportMode="details" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
