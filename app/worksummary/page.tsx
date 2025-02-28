// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Search,
//   Filter,
//   Download,
//   ChevronDown,
//   ChevronRight,
//   X,
// } from "lucide-react";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { format, parse } from "date-fns";
// import { swipperType } from "@/types/swipperType";
// import { julyData } from "@/data/message";
// import ExportExcel from "@/components/ExportExcelSwp";
// import Cookies from "js-cookie";
// import { useRouter } from "next/navigation";

// // Define the trip interface
// interface Trip extends swipperType {
//   "Start Datetime": string;
//   "Start Location": string;
//   "End Datetime": string;
//   "End Location": string;
//   Driver: string;
//   "Employee No": string;
//   Distance: string;
//   "Working Duration": string;
// }

// // Define the vehicle data structure
// interface VehicleData {
//   [vehicleNumber: string]: Trip[];
// }

// // Flat structure for display
// interface DisplayTrip extends Trip {
//   vehicleNumber: string;
//   id: string;
// }

// const WorkHourSummary = () => {
//   const router = useRouter();
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [filters, setFilters] = useState({
//     company: "BMCSWIPPER",
//     branch: "BMCSWIPPER",
//     vehicleNumber: "",
//   });
//   const [dateRange, setDateRange] = useState({
//     startDate: new Date("2024-07-07"),
//     endDate: new Date("2024-07-27"),
//   });
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
//   const [expandedRows, setExpandedRows] = useState<string[]>([]);
//   const [filteredData, setFilteredData] = useState<DisplayTrip[]>([]);

//   // Convert nested data to flat structure for display
//   const flattenData = useCallback(() => {
//     const flatData: DisplayTrip[] = [];
//     julyData.forEach((vehicleObj) => {
//       Object.entries(vehicleObj).forEach(([vehicleNumber, trips]) => {
//         trips.forEach((trip, index) => {
//           flatData.push({
//             ...trip,
//             vehicleNumber,
//             id: `${vehicleNumber}-${index}`,
//           });
//         });
//       });
//     });
//     return flatData;
//   }, []);

//   const applyFilters = useCallback(() => {
//     let results: DisplayTrip[] = flattenData();

//     // Apply search filter
//     if (searchTerm) {
//       results = results.filter(
//         (trip) =>
//           trip.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           trip.Driver.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }

//     // Apply date range filter
//     results = results.filter((trip) => {
//       const startDate = parse(
//         trip["Start Datetime"],
//         "yyyy-MM-dd HH:mm:ss",
//         new Date()
//       );
//       return startDate >= dateRange.startDate && startDate <= dateRange.endDate;
//     });

//     // Apply vehicle number filter
//     if (filters.vehicleNumber) {
//       results = results.filter(
//         (trip) => trip.vehicleNumber === filters.vehicleNumber
//       );
//     }

//     setFilteredData(results);
//   }, [searchTerm, dateRange, filters.vehicleNumber]);

//   useEffect(() => {
//     applyFilters();
//   }, [applyFilters]);
//   const toggleRow = (vehicleNumber: string) => {
//     setExpandedRows((prev) =>
//       prev.includes(vehicleNumber)
//         ? prev.filter((v) => v !== vehicleNumber)
//         : [...prev, vehicleNumber]
//     );
//   };
//   // Transform filteredData into VehicleData format for ExportExcel
//   const transformToVehicleData = (trips: DisplayTrip[]): VehicleData[] => {
//     const vehicleData: VehicleData = {};
//     trips.forEach((trip) => {
//       if (!vehicleData[trip.vehicleNumber]) {
//         vehicleData[trip.vehicleNumber] = [];
//       }
//       vehicleData[trip.vehicleNumber].push({
//         "Start Datetime": trip["Start Datetime"],
//         "Start Location": trip["Start Location"],
//         "End Datetime": trip["End Datetime"],
//         "End Location": trip["End Location"],
//         Driver: trip.Driver,
//         "Employee No": trip["Employee No"],
//         Distance: trip.Distance || "0",
//         "Working Duration": trip["Working Duration"] || "00:00",
//       });
//     });
//     return [vehicleData];
//   };

//   return (
//     <div className="min-h-screen w-full bg-background">
//       {/* Header */}
//       <div className="bg-white border-b sticky top-0 z-10">
//         <div className="max-w-full mx-auto px-4 py-3">
//           <div className="flex justify-between items-center">
//             <h4 className="text-lg font-semibold">
//               Work Hour Summary [
//               {format(dateRange.startDate, "dd-MM-yyyy HH:mm:ss a")} -{" "}
//               {format(dateRange.endDate, "dd-MM-yyyy HH:mm:ss a")}]
//             </h4>
//             <div className="flex items-center gap-3">
//               <div className="relative">
//                 <Input
//                   placeholder="Search vehicles or drivers..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pr-10"
//                 />
//                 <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               </div>
//               <Button
//                 variant="outline"
//                 size="icon"
//                 onClick={() => setIsFilterOpen(true)}
//               >
//                 <Filter className="h-4 w-4" />
//               </Button>
//               <Button
//                 onClick={() => {
//                   Cookies.remove("isAuthenticated");
//                   router.push("/");
//                 }}
//               >
//                 Logout
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-full mx-auto px-4 py-4">
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-12"></TableHead>
//               <TableHead>Object</TableHead>
//               <TableHead>Vehicle Brand</TableHead>
//               <TableHead>Vehicle Model</TableHead>
//               <TableHead>Driver</TableHead>
//               <TableHead>Distance</TableHead>
//               <TableHead>Working Duration</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {Object.entries(
//               filteredData
//                 // Sort all data by Start Datetime before grouping
//                 .sort((a, b) => {
//                   const dateA = parse(
//                     a["Start Datetime"],
//                     "yyyy-MM-dd HH:mm:ss",
//                     new Date()
//                   );
//                   const dateB = parse(
//                     b["Start Datetime"],
//                     "yyyy-MM-dd HH:mm:ss",
//                     new Date()
//                   );
//                   return dateA.getTime() - dateB.getTime();
//                 })
//                 .reduce((acc: { [key: string]: DisplayTrip[] }, trip) => {
//                   if (!acc[trip.vehicleNumber]) {
//                     acc[trip.vehicleNumber] = [];
//                   }
//                   acc[trip.vehicleNumber].push(trip);
//                   return acc;
//                 }, {})
//             ).map(([vehicleNumber, trips]) => {
//               // Sort trips within each vehicle group by Start Datetime
//               trips.sort((a, b) => {
//                 const dateA = parse(
//                   a["Start Datetime"],
//                   "yyyy-MM-dd HH:mm:ss",
//                   new Date()
//                 );
//                 const dateB = parse(
//                   b["Start Datetime"],
//                   "yyyy-MM-dd HH:mm:ss",
//                   new Date()
//                 );
//                 return dateA.getTime() - dateB.getTime();
//               });

//               const isExpanded = expandedRows.includes(vehicleNumber);
//               const totalDistance = trips
//                 .reduce(
//                   (sum, trip) => sum + parseFloat(trip.Distance || "0"),
//                   0
//                 )
//                 .toFixed(2);
//               const totalDuration = trips.reduce((sum, trip) => {
//                 const [hours, minutes] = trip["Working Duration"]
//                   .split(":")
//                   .map(Number);
//                 return sum + (hours * 60 + minutes);
//               }, 0);
//               const totalHours = Math.floor(totalDuration / 60);
//               const totalMinutes = totalDuration % 60;
//               const formattedDuration = `${totalHours
//                 .toString()
//                 .padStart(2, "0")}:${totalMinutes.toString().padStart(2, "0")}`;

//               return (
//                 <>
//                   <TableRow key={vehicleNumber}>
//                     <TableCell className="w-12">
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => toggleRow(vehicleNumber)}
//                       >
//                         {isExpanded ? (
//                           <ChevronDown className="h-4 w-4" />
//                         ) : (
//                           <ChevronRight className="h-4 w-4" />
//                         )}
//                       </Button>
//                     </TableCell>
//                     <TableCell>{vehicleNumber}</TableCell>
//                     <TableCell>Ambulance</TableCell>
//                     <TableCell>12e2r3</TableCell>
//                     <TableCell>{trips[0].Driver}</TableCell>
//                     <TableCell>{totalDistance}</TableCell>
//                     <TableCell>{formattedDuration}</TableCell>
//                   </TableRow>
//                   {isExpanded && (
//                     <TableRow
//                       key={`${vehicleNumber}-details`}
//                       className="bg-gray-50"
//                     >
//                       <TableCell colSpan={7} className="p-0">
//                         <Table>
//                           <TableHeader>
//                             <TableRow>
//                               <TableHead>Start Datetime</TableHead>
//                               <TableHead>Start Location</TableHead>
//                               <TableHead>End Datetime</TableHead>
//                               <TableHead>End Location</TableHead>
//                               <TableHead>Distance (km)</TableHead>
//                               <TableHead>Working Duration</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {trips.map((trip, index) => (
//                               <TableRow
//                                 key={`${vehicleNumber}-${index}-detail`}
//                               >
//                                 <TableCell>
//                                   {format(
//                                     parse(
//                                       trip["Start Datetime"],
//                                       "yyyy-MM-dd HH:mm:ss",
//                                       new Date()
//                                     ),
//                                     "dd-MM-yyyy HH:mm:ss a"
//                                   )}
//                                 </TableCell>
//                                 <TableCell>{trip["Start Location"]}</TableCell>
//                                 <TableCell>
//                                   {format(
//                                     parse(
//                                       trip["End Datetime"],
//                                       "yyyy-MM-dd HH:mm:ss",
//                                       new Date()
//                                     ),
//                                     "dd-MM-yyyy HH:mm:ss a"
//                                   )}
//                                 </TableCell>
//                                 <TableCell>{trip["End Location"]}</TableCell>
//                                 <TableCell>{trip.Distance}</TableCell>
//                                 <TableCell>
//                                   {trip["Working Duration"]}
//                                 </TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                         <div className="p-4">
//                           <p>
//                             <strong>Total Distance:</strong> {totalDistance} km
//                           </p>
//                           <p>
//                             <strong>Total Working Duration:</strong>{" "}
//                             {formattedDuration}
//                           </p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )}
//                 </>
//               );
//             })}
//           </TableBody>
//         </Table>
//       </div>

//       {/* Filter Sidebar */}
//       {isFilterOpen && (
//         <div className="fixed inset-0 z-50">
//           <div
//             className="fixed inset-0 bg-black/50"
//             onClick={() => setIsFilterOpen(false)}
//           />
//           <div className="fixed right-0 top-0 h-full w-80 bg-white p-4 shadow-lg">
//             <div className="flex justify-between items-center mb-4">
//               <h5 className="font-semibold">Filters</h5>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => setIsFilterOpen(false)}
//               >
//                 <X className="h-4 w-4" />
//               </Button>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-sm font-medium">Company</label>
//                 <select
//                   value={filters.company}
//                   onChange={(e) =>
//                     setFilters({ ...filters, company: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option>BMCSWIPPER</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium">Branch</label>
//                 <select
//                   value={filters.branch}
//                   onChange={(e) =>
//                     setFilters({ ...filters, branch: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option>BMCSWIPPER</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium">Vehicle Number</label>
//                 <select
//                   value={filters.vehicleNumber}
//                   onChange={(e) =>
//                     setFilters({ ...filters, vehicleNumber: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option value="">All</option>
//                   {Array.from(
//                     new Set(flattenData().map((trip) => trip.vehicleNumber))
//                   ).map((vehicleNumber) => (
//                     <option key={vehicleNumber} value={vehicleNumber}>
//                       {vehicleNumber}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium">Date Range</label>
//                 <div className="grid grid-cols-2 gap-2 mt-1">
//                   <Popover>
//                     <PopoverTrigger asChild>
//                       <Button variant="outline" className="w-full">
//                         {format(dateRange.startDate, "dd-MM-yyyy HH:mm:ss")}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent>
//                       <Calendar
//                         mode="single"
//                         selected={dateRange.startDate}
//                         onSelect={(date) =>
//                           date &&
//                           setDateRange({ ...dateRange, startDate: date })
//                         }
//                       />
//                     </PopoverContent>
//                   </Popover>
//                   <Popover>
//                     <PopoverTrigger asChild>
//                       <Button variant="outline" className="w-full">
//                         {format(dateRange.endDate, "dd-MM-yyyy HH:mm:ss")}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent>
//                       <Calendar
//                         mode="single"
//                         selected={dateRange.endDate}
//                         onSelect={(date) =>
//                           date && setDateRange({ ...dateRange, endDate: date })
//                         }
//                       />
//                     </PopoverContent>
//                   </Popover>
//                 </div>
//               </div>

//               <div className="flex gap-2">
//                 <Button
//                   onClick={() => {
//                     applyFilters();
//                     setIsFilterOpen(false);
//                   }}
//                 >
//                   Apply Filters
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={() => {
//                     setFilters({
//                       company: "BMCSWIPPER",
//                       branch: "BMCSWIPPER",
//                       vehicleNumber: "",
//                     });
//                     setDateRange({
//                       startDate: new Date("2024-07-07"),
//                       endDate: new Date("2024-07-27"),
//                     });
//                     setSearchTerm("");
//                   }}
//                 >
//                   Reset
//                 </Button>
//               </div>

//               <div className="pt-4 border-t">
//                 <div className="flex gap-2">
//                   <ExportExcel
//                     data={transformToVehicleData(filteredData)}
//                     exportMode="summary"
//                   />
//                   <ExportExcel
//                     data={transformToVehicleData(filteredData)}
//                     exportMode="details"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default WorkHourSummary;

// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Search,
//   Filter,
//   Download,
//   ChevronDown,
//   ChevronRight,
//   X,
//   Clock,
//   Calendar as CalendarIcon,
// } from "lucide-react";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { format, parse, setHours, setMinutes, setSeconds } from "date-fns";
// import { swipperType } from "@/types/swipperType";
// import { julyData } from "@/data/message";
// import ExportExcel from "@/components/ExportExcelSwp";
// import Cookies from "js-cookie";
// import { useRouter } from "next/navigation";

// // Define the trip interface
// interface Trip extends swipperType {
//   "Start Datetime": string;
//   "Start Location": string;
//   "End Datetime": string;
//   "End Location": string;
//   Driver: string;
//   "Employee No": string;
//   Distance: string;
//   "Working Duration": string;
// }

// // Define the vehicle data structure
// interface VehicleData {
//   [vehicleNumber: string]: Trip[];
// }

// // Flat structure for display
// interface DisplayTrip extends Trip {
//   vehicleNumber: string;
//   id: string;
// }

// const WorkHourSummary = () => {
//   const router = useRouter();
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [filters, setFilters] = useState({
//     company: "BMCSWIPPER",
//     branch: "BMCSWIPPER",
//     vehicleNumber: "",
//   });
//   const [dateRange, setDateRange] = useState({
//     startDate: new Date("2024-07-07"),
//     endDate: new Date("2024-07-27"),
//   });
//   const [timeRange, setTimeRange] = useState({
//     startTime: { hours: "00", minutes: "00", seconds: "00" },
//     endTime: { hours: "23", minutes: "59", seconds: "59" },
//   });
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
//   const [expandedRows, setExpandedRows] = useState<string[]>([]);
//   const [filteredData, setFilteredData] = useState<DisplayTrip[]>([]);
//   const [openStartCalendar, setOpenStartCalendar] = useState(false);
//   const [openEndCalendar, setOpenEndCalendar] = useState(false);

//   // Convert nested data to flat structure for display
//   const flattenData = useCallback(() => {
//     const flatData: DisplayTrip[] = [];
//     julyData.forEach((vehicleObj) => {
//       Object.entries(vehicleObj).forEach(([vehicleNumber, trips]) => {
//         trips.forEach((trip, index) => {
//           flatData.push({
//             ...trip,
//             vehicleNumber,
//             id: `${vehicleNumber}-${index}`,
//           });
//         });
//       });
//     });
//     return flatData;
//   }, []);

//   // Combine date and time into a single Date object
//   const combineDateAndTime = useCallback(
//     (date: Date, time: { hours: string; minutes: string; seconds: string }) => {
//       const newDate = new Date(date);
//       return setSeconds(
//         setMinutes(
//           setHours(newDate, parseInt(time.hours)),
//           parseInt(time.minutes)
//         ),
//         parseInt(time.seconds)
//       );
//     },
//     []
//   );

//   const applyFilters = useCallback(() => {
//     let results: DisplayTrip[] = flattenData();

//     // Apply search filter
//     if (searchTerm) {
//       results = results.filter(
//         (trip) =>
//           trip.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           trip.Driver.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }

//     // Apply date and time range filter
//     const startDateTime = combineDateAndTime(
//       dateRange.startDate,
//       timeRange.startTime
//     );
//     const endDateTime = combineDateAndTime(
//       dateRange.endDate,
//       timeRange.endTime
//     );

//     results = results.filter((trip) => {
//       const tripDateTime = parse(
//         trip["Start Datetime"],
//         "yyyy-MM-dd HH:mm:ss",
//         new Date()
//       );
//       return tripDateTime >= startDateTime && tripDateTime <= endDateTime;
//     });

//     // Apply vehicle number filter
//     if (filters.vehicleNumber) {
//       results = results.filter(
//         (trip) => trip.vehicleNumber === filters.vehicleNumber
//       );
//     }

//     setFilteredData(results);
//   }, [
//     searchTerm,
//     dateRange,
//     timeRange,
//     filters.vehicleNumber,
//     combineDateAndTime,
//     flattenData,
//   ]);

//   useEffect(() => {
//     applyFilters();
//   }, [applyFilters]);

//   const toggleRow = (vehicleNumber: string) => {
//     setExpandedRows((prev) =>
//       prev.includes(vehicleNumber)
//         ? prev.filter((v) => v !== vehicleNumber)
//         : [...prev, vehicleNumber]
//     );
//   };

//   // Transform filteredData into VehicleData format for ExportExcel
//   const transformToVehicleData = (trips: DisplayTrip[]): VehicleData[] => {
//     const vehicleData: VehicleData = {};
//     trips.forEach((trip) => {
//       if (!vehicleData[trip.vehicleNumber]) {
//         vehicleData[trip.vehicleNumber] = [];
//       }
//       vehicleData[trip.vehicleNumber].push({
//         "Start Datetime": trip["Start Datetime"],
//         "Start Location": trip["Start Location"],
//         "End Datetime": trip["End Datetime"],
//         "End Location": trip["End Location"],
//         Driver: trip.Driver,
//         "Employee No": trip["Employee No"],
//         Distance: trip.Distance || "0",
//         "Working Duration": trip["Working Duration"] || "00:00",
//       });
//     });
//     return [vehicleData];
//   };

//   // Handle time input changes
// const handleTimeChange = (
//   timeType: "startTime" | "endTime",
//   field: "hours" | "minutes" | "seconds",
//   value: string
// ) => {
//   // Allow typing to continue by only validating when input is complete
//   let formattedValue = value;

//   // Only validate and format when the input is finished or empty
//   if (value.length === 0) {
//     formattedValue = "00";
//   } else if (value.length > 2) {
//     // If more than 2 characters, take only the last 2
//     formattedValue = value.slice(-2);
//   }

//   // Validate number range only when we have a complete input
//   if (value.length === 2) {
//     const numValue = parseInt(value);
//     const maxValues = { hours: 23, minutes: 59, seconds: 59 };

//     if (!isNaN(numValue)) {
//       if (numValue > maxValues[field]) {
//         formattedValue = maxValues[field].toString();
//       } else if (numValue < 0) {
//         formattedValue = "00";
//       }
//     } else {
//       formattedValue = "00";
//     }
//   }

//   setTimeRange((prev) => ({
//     ...prev,
//     [timeType]: { ...prev[timeType], [field]: formattedValue },
//   }));
// };

//   const formatDateTimeForDisplay = (
//     date: Date,
//     time: { hours: string; minutes: string; seconds: string }
//   ) => {
//     return `${format(date, "dd-MM-yyyy")} ${time.hours}:${time.minutes}:${time.seconds}`;
//   };

//   return (
//     <div className="min-h-screen w-full bg-background">
//       {/* Header */}
//       <div className="bg-white border-b sticky top-0 z-10">
//         <div className="max-w-full mx-auto px-4 py-3">
//           <div className="flex justify-between items-center">
//             <h4 className="text-lg font-semibold">
//               Work Hour Summary [
//               {formatDateTimeForDisplay(
//                 dateRange.startDate,
//                 timeRange.startTime
//               )}{" "}
//               - {formatDateTimeForDisplay(dateRange.endDate, timeRange.endTime)}
//               ]
//             </h4>
//             <div className="flex items-center gap-3">
//               <div className="relative">
//                 <Input
//                   placeholder="Search vehicles or drivers..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pr-10"
//                 />
//                 <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               </div>
//               <Button
//                 variant="outline"
//                 size="icon"
//                 onClick={() => setIsFilterOpen(true)}
//               >
//                 <Filter className="h-4 w-4" />
//               </Button>
//               <Button
//                 onClick={() => {
//                   Cookies.remove("isAuthenticated");
//                   router.push("/");
//                 }}
//               >
//                 Logout
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Main Content */}
//       <div className="max-w-full mx-auto px-4 py-4">
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead className="w-12"></TableHead>
//               <TableHead>Object</TableHead>
//               <TableHead>Vehicle Brand</TableHead>
//               <TableHead>Vehicle Model</TableHead>
//               <TableHead>Driver</TableHead>
//               <TableHead>Distance</TableHead>
//               <TableHead>Working Duration</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {Object.entries(
//               filteredData
//                 // Sort all data by Start Datetime before grouping
//                 .sort((a, b) => {
//                   const dateA = parse(
//                     a["Start Datetime"],
//                     "yyyy-MM-dd HH:mm:ss",
//                     new Date()
//                   );
//                   const dateB = parse(
//                     b["Start Datetime"],
//                     "yyyy-MM-dd HH:mm:ss",
//                     new Date()
//                   );
//                   return dateA.getTime() - dateB.getTime();
//                 })
//                 .reduce((acc: { [key: string]: DisplayTrip[] }, trip) => {
//                   if (!acc[trip.vehicleNumber]) {
//                     acc[trip.vehicleNumber] = [];
//                   }
//                   acc[trip.vehicleNumber].push(trip);
//                   return acc;
//                 }, {})
//             ).map(([vehicleNumber, trips]) => {
//               // Sort trips within each vehicle group by Start Datetime
//               trips.sort((a, b) => {
//                 const dateA = parse(
//                   a["Start Datetime"],
//                   "yyyy-MM-dd HH:mm:ss",
//                   new Date()
//                 );
//                 const dateB = parse(
//                   b["Start Datetime"],
//                   "yyyy-MM-dd HH:mm:ss",
//                   new Date()
//                 );
//                 return dateA.getTime() - dateB.getTime();
//               });

//               const isExpanded = expandedRows.includes(vehicleNumber);
//               const totalDistance = trips
//                 .reduce(
//                   (sum, trip) => sum + parseFloat(trip.Distance || "0"),
//                   0
//                 )
//                 .toFixed(2);
//               const totalDuration = trips.reduce((sum, trip) => {
//                 const [hours, minutes] = trip["Working Duration"]
//                   .split(":")
//                   .map(Number);
//                 return sum + (hours * 60 + minutes);
//               }, 0);
//               const totalHours = Math.floor(totalDuration / 60);
//               const totalMinutes = totalDuration % 60;
//               const formattedDuration = `${totalHours
//                 .toString()
//                 .padStart(2, "0")}:${totalMinutes.toString().padStart(2, "0")}`;

//               return (
//                 <>
//                   <TableRow key={vehicleNumber}>
//                     <TableCell className="w-12">
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => toggleRow(vehicleNumber)}
//                       >
//                         {isExpanded ? (
//                           <ChevronDown className="h-4 w-4" />
//                         ) : (
//                           <ChevronRight className="h-4 w-4" />
//                         )}
//                       </Button>
//                     </TableCell>
//                     <TableCell>{vehicleNumber}</TableCell>
//                     <TableCell>Ambulance</TableCell>
//                     <TableCell>12e2r3</TableCell>
//                     <TableCell>{trips[0].Driver}</TableCell>
//                     <TableCell>{totalDistance}</TableCell>
//                     <TableCell>{formattedDuration}</TableCell>
//                   </TableRow>
//                   {isExpanded && (
//                     <TableRow
//                       key={`${vehicleNumber}-details`}
//                       className="bg-gray-50"
//                     >
//                       <TableCell colSpan={7} className="p-0">
//                         <Table>
//                           <TableHeader>
//                             <TableRow>
//                               <TableHead>Start Datetime</TableHead>
//                               <TableHead>Start Location</TableHead>
//                               <TableHead>End Datetime</TableHead>
//                               <TableHead>End Location</TableHead>
//                               <TableHead>Distance (km)</TableHead>
//                               <TableHead>Working Duration</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {trips.map((trip, index) => (
//                               <TableRow
//                                 key={`${vehicleNumber}-${index}-detail`}
//                               >
//                                 <TableCell>
//                                   {format(
//                                     parse(
//                                       trip["Start Datetime"],
//                                       "yyyy-MM-dd HH:mm:ss",
//                                       new Date()
//                                     ),
//                                     "dd-MM-yyyy HH:mm:ss a"
//                                   )}
//                                 </TableCell>
//                                 <TableCell>{trip["Start Location"]}</TableCell>
//                                 <TableCell>
//                                   {format(
//                                     parse(
//                                       trip["End Datetime"],
//                                       "yyyy-MM-dd HH:mm:ss",
//                                       new Date()
//                                     ),
//                                     "dd-MM-yyyy HH:mm:ss a"
//                                   )}
//                                 </TableCell>
//                                 <TableCell>{trip["End Location"]}</TableCell>
//                                 <TableCell>{trip.Distance}</TableCell>
//                                 <TableCell>
//                                   {trip["Working Duration"]}
//                                 </TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                         <div className="p-4">
//                           <p>
//                             <strong>Total Distance:</strong> {totalDistance} km
//                           </p>
//                           <p>
//                             <strong>Total Working Duration:</strong>{" "}
//                             {formattedDuration}
//                           </p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )}
//                 </>
//               );
//             })}
//           </TableBody>
//         </Table>
//       </div>

//       {/* Filter Sidebar */}
//       {isFilterOpen && (
//         <div className="fixed inset-0 z-50">
//           <div
//             className="fixed inset-0 bg-black/50"
//             onClick={() => setIsFilterOpen(false)}
//           />
//           <div className="fixed right-0 top-0 h-full w-80 bg-white p-4 shadow-lg overflow-auto">
//             <div className="flex justify-between items-center mb-4">
//               <h5 className="font-semibold">Filters</h5>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 onClick={() => setIsFilterOpen(false)}
//               >
//                 <X className="h-4 w-4" />
//               </Button>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-sm font-medium">Company</label>
//                 <select
//                   value={filters.company}
//                   onChange={(e) =>
//                     setFilters({ ...filters, company: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option>BMCSWIPPER</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium">Branch</label>
//                 <select
//                   value={filters.branch}
//                   onChange={(e) =>
//                     setFilters({ ...filters, branch: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option>BMCSWIPPER</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium">Vehicle Number</label>
//                 <select
//                   value={filters.vehicleNumber}
//                   onChange={(e) =>
//                     setFilters({ ...filters, vehicleNumber: e.target.value })
//                   }
//                   className="w-full mt-1 rounded-md border border-input bg-background p-2"
//                 >
//                   <option value="">All</option>
//                   {Array.from(
//                     new Set(flattenData().map((trip) => trip.vehicleNumber))
//                   ).map((vehicleNumber) => (
//                     <option key={vehicleNumber} value={vehicleNumber}>
//                       {vehicleNumber}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="text-sm font-medium mb-1 block">
//                   Start Date & Time
//                 </label>
//                 <div className="space-y-2">
//                   <Popover
//                     open={openStartCalendar}
//                     onOpenChange={setOpenStartCalendar}
//                   >
//                     <PopoverTrigger asChild>
//                       <Button
//                         variant="outline"
//                         className="w-full justify-start"
//                       >
//                         <CalendarIcon className="mr-2 h-4 w-4" />
//                         {format(dateRange.startDate, "dd-MM-yyyy")}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="p-0" align="start">
//                       <Calendar
//                         mode="single"
//                         selected={dateRange.startDate}
//                         onSelect={(date) => {
//                           if (date) {
//                             setDateRange({ ...dateRange, startDate: date });
//                             setOpenStartCalendar(false);
//                           }
//                         }}
//                         initialFocus
//                       />
//                     </PopoverContent>
//                   </Popover>

//                   <div className="flex items-center">
//                     <Clock className="mr-2 h-4 w-4" />
//                     <div className="flex justify-between gap-1">
//                       <Input
//                         value={timeRange.startTime.hours}
//                         onChange={(e) =>
//                           handleTimeChange("startTime", "hours", e.target.value)
//                         }
//                         className="w-14 text-center"
//                         placeholder="HH"
//                         maxLength={2}
//                       />
//                       <span className="text-center py-2">:</span>
//                       <Input
//                         value={timeRange.startTime.minutes}
//                         onChange={(e) =>
//                           handleTimeChange(
//                             "startTime",
//                             "minutes",
//                             e.target.value
//                           )
//                         }
//                         className="w-14 text-center"
//                         placeholder="MM"
//                         maxLength={2}
//                       />
//                       <span className="text-center py-2">:</span>
//                       <Input
//                         value={timeRange.startTime.seconds}
//                         onChange={(e) =>
//                           handleTimeChange(
//                             "startTime",
//                             "seconds",
//                             e.target.value
//                           )
//                         }
//                         className="w-14 text-center"
//                         placeholder="SS"
//                         maxLength={2}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-medium mb-1 block">
//                   End Date & Time
//                 </label>
//                 <div className="space-y-2">
//                   <Popover
//                     open={openEndCalendar}
//                     onOpenChange={setOpenEndCalendar}
//                   >
//                     <PopoverTrigger asChild>
//                       <Button
//                         variant="outline"
//                         className="w-full justify-start"
//                       >
//                         <CalendarIcon className="mr-2 h-4 w-4" />
//                         {format(dateRange.endDate, "dd-MM-yyyy")}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="p-0" align="start">
//                       <Calendar
//                         mode="single"
//                         selected={dateRange.endDate}
//                         onSelect={(date) => {
//                           if (date) {
//                             setDateRange({ ...dateRange, endDate: date });
//                             setOpenEndCalendar(false);
//                           }
//                         }}
//                         initialFocus
//                       />
//                     </PopoverContent>
//                   </Popover>

//                   <div className="flex items-center">
//                     <Clock className="mr-2 h-4 w-4" />
//                     <div className="flex justify-between gap-1">
//                       <Input
//                         value={timeRange.endTime.hours}
//                         onChange={(e) =>
//                           handleTimeChange("endTime", "hours", e.target.value)
//                         }
//                         className="w-14 text-center"
//                         placeholder="HH"
//                         maxLength={2}
//                       />
//                       <span className="text-center py-2">:</span>
//                       <Input
//                         value={timeRange.endTime.minutes}
//                         onChange={(e) =>
//                           handleTimeChange("endTime", "minutes", e.target.value)
//                         }
//                         className="w-14 text-center"
//                         placeholder="MM"
//                         maxLength={2}
//                       />
//                       <span className="text-center py-2">:</span>
//                       <Input
//                         value={timeRange.endTime.seconds}
//                         onChange={(e) =>
//                           handleTimeChange("endTime", "seconds", e.target.value)
//                         }
//                         className="w-14 text-center"
//                         placeholder="SS"
//                         maxLength={2}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex gap-2">
//                 <Button
//                   onClick={() => {
//                     applyFilters();
//                     setIsFilterOpen(false);
//                   }}
//                 >
//                   Apply Filters
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={() => {
//                     setFilters({
//                       company: "BMCSWIPPER",
//                       branch: "BMCSWIPPER",
//                       vehicleNumber: "",
//                     });
//                     setDateRange({
//                       startDate: new Date("2024-07-07"),
//                       endDate: new Date("2024-07-27"),
//                     });
//                     setTimeRange({
//                       startTime: { hours: "00", minutes: "00", seconds: "00" },
//                       endTime: { hours: "23", minutes: "59", seconds: "59" },
//                     });
//                     setSearchTerm("");
//                   }}
//                 >
//                   Reset
//                 </Button>
//               </div>

//               <div className="pt-4 border-t">
//                 <div className="flex gap-2">
//                   <ExportExcel
//                     data={transformToVehicleData(filteredData)}
//                     exportMode="summary"
//                   />
//                   <ExportExcel
//                     data={transformToVehicleData(filteredData)}
//                     exportMode="details"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default WorkHourSummary;
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
          trip.Driver.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter with time
    results = results.filter((trip) => {
      const tripStart = parse(
        trip["Start Datetime"],
        "yyyy-MM-dd HH:mm:ss",
        new Date()
      );

      return (
        tripStart >= dateRange.startDateTime &&
        tripStart <= dateRange.endDateTime
      );
    });

    // Apply vehicle number filter
    if (filters.vehicleNumber) {
      results = results.filter(
        (trip) => trip.vehicleNumber === filters.vehicleNumber
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
        : [...prev, vehicleNumber]
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
                    new Date()
                  );
                  const dateB = parse(
                    b["Start Datetime"],
                    "yyyy-MM-dd HH:mm:ss",
                    new Date()
                  );
                  return dateA.getTime() - dateB.getTime();
                })
                .reduce((acc: { [key: string]: DisplayTrip[] }, trip) => {
                  if (!acc[trip.vehicleNumber]) {
                    acc[trip.vehicleNumber] = [];
                  }
                  acc[trip.vehicleNumber].push(trip);
                  return acc;
                }, {})
            ).map(([vehicleNumber, trips]) => {
              // Sort trips within each vehicle group by Start Datetime
              trips.sort((a, b) => {
                const dateA = parse(
                  a["Start Datetime"],
                  "yyyy-MM-dd HH:mm:ss",
                  new Date()
                );
                const dateB = parse(
                  b["Start Datetime"],
                  "yyyy-MM-dd HH:mm:ss",
                  new Date()
                );
                return dateA.getTime() - dateB.getTime();
              });

              const isExpanded = expandedRows.includes(vehicleNumber);
              const totalDistance = trips
                .reduce(
                  (sum, trip) => sum + parseFloat(trip.Distance || "0"),
                  0
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
                    <TableCell>Ambulance</TableCell>
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
                                      new Date()
                                    ),
                                    "dd-MM-yyyy HH:mm:ss a"
                                  )}
                                </TableCell>
                                <TableCell>{trip["Start Location"]}</TableCell>
                                <TableCell>
                                  {format(
                                    parse(
                                      trip["End Datetime"],
                                      "yyyy-MM-dd HH:mm:ss",
                                      new Date()
                                    ),
                                    "dd-MM-yyyy HH:mm:ss a"
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
                    new Set(flattenData().map((trip) => trip.vehicleNumber))
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
