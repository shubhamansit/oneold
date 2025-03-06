"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import ExportExcel from "@/components/ExportExcepforBMC";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import EnhancedWorkHourSummary from "@/components/EnhancedWorkHourSummary";

// Define the shift record interface
interface ShiftRecord {
  "Sr. No": string;
  Date: string;
  "Veh. No": string;
  "Day/Night": string;
  "Start Time": string;
  "End Time": string;
  "Shift Hours": string;
  "Kms. As per Logbook": string;
  "Kms. As per GPS System": string;
  "Running hours.": string;
  "Idel ": string;
  Stopage: string;
  id?: string;
}

// Sample data - import from a separate file in a real application
import { sampleData } from "@/data/sampleData";

// Interface for vehicle summary
interface VehicleSummary {
  vehicleNumber: string;
  records: ShiftRecord[];
  totalShiftHours: string;
  totalKmsLogbook: number;
  totalKmsGPS: number;
  totalRunningHours: string;
  totalIdleTime: string;
  totalStopageTime: string;
}

const WorkHourSummary = () => {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    company: "BMCSWIPPER",
    branch: "BMCSWIPPER",
    vehicleNumber: "",
    shiftType: "",
  });

  // Use full Date objects for both start and end times
  const [dateRange, setDateRange] = useState({
    startDateTime: new Date("2024-07-01T00:00:00"),
    endDateTime: new Date("2024-07-31T23:59:59"),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<ShiftRecord[]>([]);
  const [vehicleSummaries, setVehicleSummaries] = useState<VehicleSummary[]>(
    []
  );

  // Helper function to parse time string (HH:MM or H:MM format)
  const parseTimeString = (
    timeStr: string
  ): { hours: number; minutes: number } => {
    const parts = timeStr.split(":");
    return {
      hours: Number.parseInt(parts[0], 10),
      minutes: Number.parseInt(parts[1], 10) || 0,
    };
  };

  // Helper function to add time values (HH:MM format)
  const addTimes = (times: string[]): string => {
    let totalMinutes = 0;

    times.forEach((time) => {
      const { hours, minutes } = parseTimeString(time);
      totalMinutes += hours * 60 + minutes;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Function to create vehicle summaries from records
  const createVehicleSummaries = useCallback(
    (records: ShiftRecord[]): VehicleSummary[] => {
      // Group records by vehicle number
      const vehicleGroups: { [key: string]: ShiftRecord[] } = {};

      records.forEach((record) => {
        const vehicleNumber = record["Veh. No"];
        if (!vehicleGroups[vehicleNumber]) {
          vehicleGroups[vehicleNumber] = [];
        }
        vehicleGroups[vehicleNumber].push(record);
      });

      // Create summary for each vehicle
      return Object.entries(vehicleGroups).map(([vehicleNumber, records]) => {
        const totalKmsLogbook = records.reduce(
          (sum, record) =>
            sum + Number.parseFloat(record["Kms. As per Logbook"] || "0"),
          0
        );

        const totalKmsGPS = records.reduce(
          (sum, record) =>
            sum + Number.parseFloat(record["Kms. As per GPS System"] || "0"),
          0
        );

        const shiftHours = records.map((record) => record["Shift Hours"]);
        const runningHours = records.map((record) => record["Running hours."]);
        const idleTimes = records.map((record) => record["Idel "]);
        const stopageTimes = records.map((record) => record["Stopage"]);

        return {
          vehicleNumber,
          records,
          totalShiftHours: addTimes(shiftHours),
          totalKmsLogbook,
          totalKmsGPS,
          totalRunningHours: addTimes(runningHours),
          totalIdleTime: addTimes(idleTimes),
          totalStopageTime: addTimes(stopageTimes),
        };
      });
    },
    []
  );

  // Parse and format date
  const parseDate = (dateStr: string) => {
    // Parse date in format "DD/MM/YYYY" or "D/M/YYYY"
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  const applyFilters = useCallback(() => {
    // Start with the sample data
    let results = [...sampleData];

    // Generate unique ID for each record if needed
    results = results.map((record, index) => ({
      ...record,
      id: `record-${index}`,
    }));

    // Apply search filter
    if (searchTerm) {
      results = results.filter((record) =>
        record["Veh. No"].toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    results = results.filter((record) => {
      const recordDate = parseDate(record.Date);
      return (
        recordDate >= new Date(dateRange.startDateTime.setHours(0, 0, 0, 0)) &&
        recordDate <= new Date(dateRange.endDateTime.setHours(23, 59, 59, 999))
      );
    });

    // Apply vehicle number filter
    if (filters.vehicleNumber) {
      results = results.filter(
        (record) => record["Veh. No"] === filters.vehicleNumber
      );
    }

    // Apply shift type filter
    if (filters.shiftType) {
      results = results.filter(
        (record) => record["Day/Night"] === filters.shiftType
      );
    }

    // Sort by date and time
    results.sort((a, b) => {
      const dateA = parseDate(a.Date);
      const dateB = parseDate(b.Date);
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredData(results);

    // Create vehicle summaries from filtered data
    const summaries = createVehicleSummaries(results);
    setVehicleSummaries(summaries);
  }, [searchTerm, dateRange, filters, createVehicleSummaries]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const toggleRow = (vehicleNumber: string) => {
    setExpandedRows((prev) =>
      prev.includes(vehicleNumber)
        ? prev.filter((v) => v !== vehicleNumber)
        : [...prev, vehicleNumber]
    );
  };

  // Format the date range for display in header
  const getFormattedDateRangeHeader = () => {
    return `${format(dateRange.startDateTime, "dd-MM-yyyy")} - ${format(dateRange.endDateTime, "dd-MM-yyyy")}`;
  };

  // Prepare data for Excel export
  const prepareExportData = () => {
    const exportData: { [vehicleNumber: string]: ShiftRecord[] } = {};

    vehicleSummaries.forEach((summary) => {
      exportData[summary.vehicleNumber] = summary.records;
    });

    return [exportData];
  };

  // Get all unique vehicle numbers for filter dropdown
  const getUniqueVehicleNumbers = () => {
    return Array.from(new Set(sampleData.map((record) => record["Veh. No"])));
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">
              Swipper Summary [{getFormattedDateRangeHeader()}]
            </h4>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Input
                  placeholder="Search vehicle number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFilterOpen(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  Cookies.remove("isAuthenticated");
                  router.push("/");
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 py-4">
        <EnhancedWorkHourSummary
          vehicleSummaries={vehicleSummaries}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
        />
      </div>

      {/* Filter Sidebar */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[400px] bg-white p-4 shadow-lg overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h5 className="font-semibold">Filters</h5>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company</label>
                <select
                  value={filters.company}
                  onChange={(e) =>
                    setFilters({ ...filters, company: e.target.value })
                  }
                  className="w-full mt-1 rounded-md border border-input bg-background p-2"
                >
                  <option>BMCSWIPPER</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Branch</label>
                <select
                  value={filters.branch}
                  onChange={(e) =>
                    setFilters({ ...filters, branch: e.target.value })
                  }
                  className="w-full mt-1 rounded-md border border-input bg-background p-2"
                >
                  <option>BMCSWIPPER</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Vehicle Number</label>
                <select
                  value={filters.vehicleNumber}
                  onChange={(e) =>
                    setFilters({ ...filters, vehicleNumber: e.target.value })
                  }
                  className="w-full mt-1 rounded-md border border-input bg-background p-2"
                >
                  <option value="">All</option>
                  {getUniqueVehicleNumbers().map((vehicleNumber) => (
                    <option key={vehicleNumber} value={vehicleNumber}>
                      {vehicleNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Shift Type</label>
                <select
                  value={filters.shiftType}
                  onChange={(e) =>
                    setFilters({ ...filters, shiftType: e.target.value })
                  }
                  className="w-full mt-1 rounded-md border border-input bg-background p-2"
                >
                  <option value="">All</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Start Date</label>
                <div className="mt-1">
                  <DatePicker
                    selected={dateRange.startDateTime}
                    onChange={(date) =>
                      date &&
                      setDateRange({ ...dateRange, startDateTime: date })
                    }
                    dateFormat="dd-MM-yyyy"
                    className="w-full rounded-md border border-input bg-background p-2"
                    placeholderText="Select start date"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">End Date</label>
                <div className="mt-1">
                  <DatePicker
                    selected={dateRange.endDateTime}
                    onChange={(date) =>
                      date && setDateRange({ ...dateRange, endDateTime: date })
                    }
                    dateFormat="dd-MM-yyyy"
                    className="w-full rounded-md border border-input bg-background p-2"
                    placeholderText="Select end date"
                    minDate={dateRange.startDateTime}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    applyFilters();
                    setIsFilterOpen(false);
                  }}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      company: "BMCSWIPPER",
                      branch: "BMCSWIPPER",
                      vehicleNumber: "",
                      shiftType: "",
                    });
                    setDateRange({
                      startDateTime: new Date("2024-07-01T00:00:00"),
                      endDateTime: new Date("2024-07-31T23:59:59"),
                    });
                    setSearchTerm("");
                  }}
                >
                  Reset
                </Button>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <ExportExcel
                    data={prepareExportData()}
                    exportMode="summary"
                  />
                  <ExportExcel
                    data={prepareExportData()}
                    exportMode="details"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkHourSummary;
