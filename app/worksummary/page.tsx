"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  X,
  Clock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parse, setHours, setMinutes, setSeconds } from "date-fns";
import { swipperType } from "@/types/swipperType";
import { julyData } from "@/data/message";
import ExportExcel from "@/components/ExportExcelSwp";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Define the trip interface
interface Trip extends swipperType {
  "Start Datetime": string;
  "Start Location": string;
  "End Datetime": string;
  "End Location": string;
  Driver: string;
  "Employee No": string;
  Distance: string;
  "Working Duration": string;
}

// Define the vehicle data structure
interface VehicleData {
  [vehicleNumber: string]: Trip[];
}

// Flat structure for display
interface DisplayTrip extends Trip {
  vehicleNumber: string;
  id: string;
}

const WorkHourSummary = () => {
  const router = useRouter();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    company: "BMCSWIPPER",
    branch: "BMCSWIPPER",
    vehicleNumber: "",
  });

  // Use full Date objects for both start and end times
  const [dateRange, setDateRange] = useState({
    startDateTime: new Date("2024-07-07T00:00:00"),
    endDateTime: new Date("2024-07-27T23:59:59"),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<DisplayTrip[]>([]);

  // Convert nested data to flat structure for display
  const flattenData = useCallback(() => {
    const flatData: DisplayTrip[] = [];
    julyData.forEach((vehicleObj) => {
      Object.entries(vehicleObj).forEach(([vehicleNumber, trips]) => {
        trips.forEach((trip, index) => {
          flatData.push({
            ...trip,
            vehicleNumber,
            id: `${vehicleNumber}-${index}`,
          });
        });
      });
    });
    return flatData;
  }, []);

  const applyFilters = useCallback(() => {
    let results: DisplayTrip[] = flattenData();

    // Apply search filter
    if (searchTerm) {
      results = results.filter(
        (trip) =>
          trip.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.Driver.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply date range filter with time
    results = results.filter((trip) => {
      const tripStart = parse(
        trip["Start Datetime"],
        "yyyy-MM-dd HH:mm:ss",
        new Date(),
      );

      return (
        tripStart >= dateRange.startDateTime &&
        tripStart <= dateRange.endDateTime
      );
    });

    // Apply vehicle number filter
    if (filters.vehicleNumber) {
      results = results.filter(
        (trip) => trip.vehicleNumber === filters.vehicleNumber,
      );
    }

    setFilteredData(results);
  }, [searchTerm, dateRange, filters.vehicleNumber]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const toggleRow = (vehicleNumber: string) => {
    setExpandedRows((prev) =>
      prev.includes(vehicleNumber)
        ? prev.filter((v) => v !== vehicleNumber)
        : [...prev, vehicleNumber],
    );
  };

  // Transform filteredData into VehicleData format for ExportExcel
  const transformToVehicleData = (trips: DisplayTrip[]): VehicleData[] => {
    const vehicleData: VehicleData = {};
    trips.forEach((trip) => {
      if (!vehicleData[trip.vehicleNumber]) {
        vehicleData[trip.vehicleNumber] = [];
      }
      vehicleData[trip.vehicleNumber].push({
        "Start Datetime": trip["Start Datetime"],
        "Start Location": trip["Start Location"],
        "End Datetime": trip["End Datetime"],
        "End Location": trip["End Location"],
        Driver: trip.Driver,
        "Employee No": trip["Employee No"],
        Distance: trip.Distance || "0",
        "Working Duration": trip["Working Duration"] || "00:00",
      });
    });
    return [vehicleData];
  };

  // Format the date range for display in header
  const getFormattedDateRangeHeader = () => {
    return `${format(dateRange.startDateTime, "dd-MM-yyyy HH:mm:ss a")} - ${format(dateRange.endDateTime, "dd-MM-yyyy HH:mm:ss a")}`;
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">
              Work Hour Summary [{getFormattedDateRangeHeader()}]
            </h4>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Input
                  placeholder="Search vehicles or drivers..."
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Object</TableHead>
              <TableHead>Vehicle Brand</TableHead>
              <TableHead>Vehicle Model</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Working Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(
              filteredData
                // Sort all data by Start Datetime before grouping
                .sort((a, b) => {
                  const dateA = parse(
                    a["Start Datetime"],
                    "yyyy-MM-dd HH:mm:ss",
                    new Date(),
                  );
                  const dateB = parse(
                    b["Start Datetime"],
                    "yyyy-MM-dd HH:mm:ss",
                    new Date(),
                  );
                  return dateA.getTime() - dateB.getTime();
                })
                .reduce((acc: { [key: string]: DisplayTrip[] }, trip) => {
                  if (!acc[trip.vehicleNumber]) {
                    acc[trip.vehicleNumber] = [];
                  }
                  acc[trip.vehicleNumber].push(trip);
                  return acc;
                }, {}),
            ).map(([vehicleNumber, trips]) => {
              // Sort trips within each vehicle group by Start Datetime
              trips.sort((a, b) => {
                const dateA = parse(
                  a["Start Datetime"],
                  "yyyy-MM-dd HH:mm:ss",
                  new Date(),
                );
                const dateB = parse(
                  b["Start Datetime"],
                  "yyyy-MM-dd HH:mm:ss",
                  new Date(),
                );
                return dateA.getTime() - dateB.getTime();
              });

              const isExpanded = expandedRows.includes(vehicleNumber);
              const totalDistance = trips
                .reduce(
                  (sum, trip) => sum + parseFloat(trip.Distance || "0"),
                  0,
                )
                .toFixed(2);
              const totalDuration = trips.reduce((sum, trip) => {
                const [hours, minutes] = trip["Working Duration"]
                  .split(":")
                  .map(Number);
                return sum + (hours * 60 + minutes);
              }, 0);
              const totalHours = Math.floor(totalDuration / 60);
              const totalMinutes = totalDuration % 60;
              const formattedDuration = `${totalHours
                .toString()
                .padStart(2, "0")}:${totalMinutes.toString().padStart(2, "0")}`;

              return (
                <>
                  <TableRow key={vehicleNumber}>
                    <TableCell className="w-12">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(vehicleNumber)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>{vehicleNumber}</TableCell>
                    <TableCell>Swipper Machine</TableCell>
                    <TableCell>12e2r3</TableCell>
                    <TableCell>{trips[0].Driver}</TableCell>
                    <TableCell>{totalDistance}</TableCell>
                    <TableCell>{formattedDuration}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow
                      key={`${vehicleNumber}-details`}
                      className="bg-gray-50"
                    >
                      <TableCell colSpan={7} className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Start Datetime</TableHead>
                              <TableHead>Start Location</TableHead>
                              <TableHead>End Datetime</TableHead>
                              <TableHead>End Location</TableHead>
                              <TableHead>Distance (km)</TableHead>
                              <TableHead>Working Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trips.map((trip, index) => (
                              <TableRow
                                key={`${vehicleNumber}-${index}-detail`}
                              >
                                <TableCell>
                                  {format(
                                    parse(
                                      trip["Start Datetime"],
                                      "yyyy-MM-dd HH:mm:ss",
                                      new Date(),
                                    ),
                                    "dd-MM-yyyy HH:mm:ss a",
                                  )}
                                </TableCell>
                                <TableCell>{trip["Start Location"]}</TableCell>
                                <TableCell>
                                  {format(
                                    parse(
                                      trip["End Datetime"],
                                      "yyyy-MM-dd HH:mm:ss",
                                      new Date(),
                                    ),
                                    "dd-MM-yyyy HH:mm:ss a",
                                  )}
                                </TableCell>
                                <TableCell>{trip["End Location"]}</TableCell>
                                <TableCell>{trip.Distance}</TableCell>
                                <TableCell>
                                  {trip["Working Duration"]}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="p-4">
                          <p>
                            <strong>Total Distance:</strong> {totalDistance} km
                          </p>
                          <p>
                            <strong>Total Working Duration:</strong>{" "}
                            {formattedDuration}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
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
                  {Array.from(
                    new Set(flattenData().map((trip) => trip.vehicleNumber)),
                  ).map((vehicleNumber) => (
                    <option key={vehicleNumber} value={vehicleNumber}>
                      {vehicleNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-10">
                <label className="text-sm font-medium">Start Date & Time</label>
                <div className="mt-1">
                  <DatePicker
                    selected={dateRange.startDateTime}
                    onChange={(date) =>
                      date &&
                      setDateRange({ ...dateRange, startDateTime: date })
                    }
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="dd-MM-yyyy HH:mm"
                    className="w-full rounded-md border border-input bg-background p-2"
                    placeholderText="Select start date and time"
                  />
                </div>
              </div>

              <div className="ml-10">
                <label className="text-sm font-medium">End Date & Time</label>
                <div className="mt-1">
                  <DatePicker
                    selected={dateRange.endDateTime}
                    onChange={(date) =>
                      date && setDateRange({ ...dateRange, endDateTime: date })
                    }
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="dd-MM-yyyy HH:mm"
                    className="w-full rounded-md border border-input bg-background p-2"
                    placeholderText="Select end date and time"
                    minDate={dateRange.startDateTime}
                  />
                </div>
              </div>

              <div className="flex gap-2 ">
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
                    });
                    setDateRange({
                      startDateTime: new Date("2024-07-07T00:00:00"),
                      endDateTime: new Date("2024-07-27T23:59:59"),
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
                    data={transformToVehicleData(filteredData)}
                    exportMode="summary"
                  />
                  <ExportExcel
                    data={transformToVehicleData(filteredData)}
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
