// import React, { useState, useEffect, useRef } from "react";
// import {
//   Table,
//   TableHeader,
//   TableBody,
//   TableHead,
//   TableCell,
//   TableRow,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import {
//   Play,
//   Pause,
//   SkipBack,
//   SkipForward,
//   ChevronDown,
//   ChevronRight,
// } from "lucide-react";
// import {
//   MapContainer,
//   TileLayer,
//   Marker,
//   Popup,
//   Polyline,
// } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";

// // Fix for default marker icons in Leaflet with Next.js
// const DefaultIcon = L.icon({
//   iconUrl: "/api/placeholder/32/32",
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
// });
// L.Marker.prototype.options.icon = DefaultIcon;

// // Define types
// interface ShiftRecord {
//   "Sr. No": string;
//   Date: string;
//   "Day/Night": string;
//   "Start Time": string;
//   "End Time": string;
//   "Shift Hours": string;
//   "Kms. As per Logbook": string;
//   "Kms. As per GPS System": string;
//   "Running hours.": string;
//   "Idel ": string;
//   Stopage: string;
//   "Veh. No": string;
//   id?: string;
//   // Adding GPS track data for simulation
//   gpsTrack?: GpsPoint[];
// }

// interface GpsPoint {
//   lat: number;
//   lng: number;
//   timestamp: string;
//   speed: number;
//   status: "running" | "idle" | "stopped";
// }

// interface VehicleSummary {
//   vehicleNumber: string;
//   records: ShiftRecord[];
//   totalShiftHours: string;
//   totalKmsLogbook: number;
//   totalKmsGPS: number;
//   totalRunningHours: string;
//   totalIdleTime: string;
//   totalStopageTime: string;
// }

// // Playback controller component
// const PlaybackControls = ({
//   // @ts-ignore
//   onPlay,
//   // @ts-ignore
//   onPause,
//   // @ts-ignore
//   onReset,
//   // @ts-ignore
//   onSpeedChange,
//   // @ts-ignore
//   isPlaying,
//   // @ts-ignore
//   playbackSpeed,
// }) => {
//   return (
//     <div className="flex items-center space-x-2 p-2">
//       <Button variant="outline" size="sm" onClick={onReset}>
//         <SkipBack className="h-4 w-4" />
//       </Button>

//       <Button
//         variant={isPlaying ? "secondary" : "default"}
//         size="sm"
//         onClick={isPlaying ? onPause : onPlay}
//       >
//         {isPlaying ? (
//           <Pause className="h-4 w-4" />
//         ) : (
//           <Play className="h-4 w-4" />
//         )}
//       </Button>

//       <select
//         className="h-8 rounded-md border border-input px-2 text-sm"
//         value={playbackSpeed}
//         onChange={(e) => onSpeedChange(Number(e.target.value))}
//       >
//         <option value="1">1x</option>
//         <option value="2">2x</option>
//         <option value="5">5x</option>
//         <option value="10">10x</option>
//       </select>
//     </div>
//   );
// };

// // Main component

// // @ts-ignore
// const EnhancedWorkHourSummary = ({
//   // @ts-ignore
//   vehicleSummaries,
//   // @ts-ignore
//   expandedRows,
//   // @ts-ignore
//   toggleRow,
// }) => {
//   const [activePlayback, setActivePlayback] = useState<string | null>(null);
//   const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null);
//   const [playbackProgress, setPlaybackProgress] = useState<number>(0);
//   const [isPlaying, setIsPlaying] = useState<boolean>(false);
//   const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
//   const [trackPoints, setTrackPoints] = useState<GpsPoint[]>([]);
//   const [previousPoints, setPreviousPoints] = useState<GpsPoint[]>([]);

//   const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const mapRef = useRef(null);

//   // Generate mock GPS data for each record if not already present
//   useEffect(() => {
//     // @ts-ignore
//     vehicleSummaries.forEach((summary) => {
//       // @ts-ignore
//       summary.records.forEach((record) => {
//         if (!record.gpsTrack) {
//           // Generate random GPS track with points based on the duration of the shift
//           // This is mock data - in a real app you would use actual GPS data
//           const startTime = new Date(
//             `${record.Date.split("/").reverse().join("-")}T${record?.["Start Time"]}`
//           );
//           const endTime = new Date(
//             `${record.Date.split("/").reverse().join("-")}T${record?.["End Time"]}`
//           );
//           const duration = (endTime.getTime() - startTime.getTime()) / 1000; // in seconds

//           // Create track with points roughly every 5 minutes
//           const pointCount = Math.max(5, Math.ceil(duration / 300));
//           const baseCoords = {
//             lat: 19.076 + (Math.random() * 0.1 - 0.05), // Mumbai area
//             lng: 72.8777 + (Math.random() * 0.1 - 0.05),
//           };

//           const track: GpsPoint[] = [];
//           for (let i = 0; i < pointCount; i++) {
//             const progress = i / (pointCount - 1);
//             const timestamp = new Date(
//               startTime.getTime() +
//                 progress * (endTime.getTime() - startTime.getTime())
//             );

//             // Add some randomness to create a path
//             const jitter = 0.005;
//             const lat =
//               baseCoords.lat +
//               (Math.random() * jitter - jitter / 2) +
//               progress * 0.01;
//             const lng =
//               baseCoords.lng +
//               (Math.random() * jitter - jitter / 2) +
//               progress * 0.01;

//             // Alternate between statuses
//             let status: "running" | "idle" | "stopped" = "running";
//             if (i % 7 === 0) status = "idle";
//             if (i % 11 === 0) status = "stopped";

//             track.push({
//               lat,
//               lng,
//               timestamp: timestamp.toISOString(),
//               speed: status === "running" ? 20 + Math.random() * 30 : 0,
//               status,
//             });
//           }

//           record.gpsTrack = track;
//         }
//       });
//     });
//   }, [vehicleSummaries]);

//   const startPlayback = (vehicleNumber: string, recordIndex: number) => {
//     // Stop any existing playback
//     if (playbackTimerRef.current) {
//       clearInterval(playbackTimerRef.current);
//     }

//     const summary = vehicleSummaries.find(
//       (s: any) => s.vehicleNumber === vehicleNumber
//     );
//     if (!summary) return;

//     const record = summary.records[recordIndex];
//     const track = record.gpsTrack;

//     if (!track || track.length === 0) {
//       console.error("No GPS track available for this record");
//       return;
//     }

//     setActivePlayback(`${vehicleNumber}-${recordIndex}`);
//     setTrackPoints(track);
//     setPreviousPoints([]);
//     setCurrentPosition(track[0]);
//     setPlaybackProgress(0);
//     setIsPlaying(true);

//     // Start playback timer
//     const intervalTime = 1000 / playbackSpeed;
//     let currentIndex = 0;

//     playbackTimerRef.current = setInterval(() => {
//       if (currentIndex < track.length - 1) {
//         currentIndex++;
//         setCurrentPosition(track[currentIndex]);
//         setPreviousPoints(track.slice(0, currentIndex + 1));
//         setPlaybackProgress(
//           Math.round((currentIndex / (track.length - 1)) * 100)
//         );
//       } else {
//         // End of track
//         setIsPlaying(false);
//         if (playbackTimerRef.current) {
//           clearInterval(playbackTimerRef.current);
//         }
//       }
//     }, intervalTime);
//   };

//   const pausePlayback = () => {
//     setIsPlaying(false);
//     if (playbackTimerRef.current) {
//       clearInterval(playbackTimerRef.current);
//     }
//   };

//   const resumePlayback = () => {
//     if (!activePlayback || !currentPosition) return;

//     setIsPlaying(true);

//     const [vehicleNumber, recordIndex] = activePlayback.split("-");
//     const summary = vehicleSummaries.find(
//       (s: any) => s.vehicleNumber === vehicleNumber
//     );
//     if (!summary) return;

//     const record = summary.records[parseInt(recordIndex)];
//     const track = record.gpsTrack;

//     if (!track || track.length === 0) return;

//     // Find current index
//     const currentIndex = track.findIndex(
//       (p: any) => p.lat === currentPosition.lat && p.lng === currentPosition.lng
//     );

//     if (currentIndex === -1 || currentIndex >= track.length - 1) return;

//     // Resume playback
//     const intervalTime = 1000 / playbackSpeed;
//     let index = currentIndex;

//     playbackTimerRef.current = setInterval(() => {
//       if (index < track.length - 1) {
//         index++;
//         setCurrentPosition(track[index]);
//         setPreviousPoints(track.slice(0, index + 1));
//         setPlaybackProgress(Math.round((index / (track.length - 1)) * 100));
//       } else {
//         // End of track
//         setIsPlaying(false);
//         if (playbackTimerRef.current) {
//           clearInterval(playbackTimerRef.current);
//         }
//       }
//     }, intervalTime);
//   };

//   const resetPlayback = () => {
//     if (!activePlayback) return;

//     const [vehicleNumber, recordIndex] = activePlayback.split("-");
//     // @ts-ignore
//     const summary = vehicleSummaries.find(
//       (s: any) => s.vehicleNumber === vehicleNumber
//     );
//     if (!summary) return;

//     const record = summary.records[parseInt(recordIndex)];
//     const track = record.gpsTrack;

//     if (!track || track.length === 0) return;

//     // Reset to beginning
//     setIsPlaying(false);
//     if (playbackTimerRef.current) {
//       clearInterval(playbackTimerRef.current);
//     }

//     setCurrentPosition(track[0]);
//     setPreviousPoints([track[0]]);
//     setPlaybackProgress(0);
//   };

//   const changePlaybackSpeed = (speed: number) => {
//     setPlaybackSpeed(speed);

//     // If currently playing, restart with new speed
//     if (isPlaying) {
//       pausePlayback();
//       setTimeout(() => resumePlayback(), 50);
//     }
//   };

//   // Clean up interval on unmount
//   useEffect(() => {
//     return () => {
//       if (playbackTimerRef.current) {
//         clearInterval(playbackTimerRef.current);
//       }
//     };
//   }, []);

//   const getMarkerColor = (status: string) => {
//     switch (status) {
//       case "running":
//         return "bg-green-500";
//       case "idle":
//         return "bg-yellow-500";
//       case "stopped":
//         return "bg-red-500";
//       default:
//         return "bg-blue-500";
//     }
//   };

//   return (
//     <div className="min-h-screen w-full bg-background">
//       {/* Map Container - only shown when playback is active */}
//       {activePlayback && (
//         <div className="w-full h-96 border rounded-md mb-4 relative">
//           <MapContainer
//             center={
//               currentPosition
//                 ? [currentPosition.lat, currentPosition.lng]
//                 : [19.076, 72.8777]
//             }
//             zoom={14}
//             style={{ height: "100%", width: "100%" }}
//             ref={mapRef}
//           >
//             <TileLayer
//               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//               attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
//             />

//             {/* Current position marker */}
//             {currentPosition && (
//               <Marker position={[currentPosition.lat, currentPosition.lng]}>
//                 <Popup>
//                   <div>
//                     <p className="font-bold">Current Position</p>
//                     <p>Speed: {currentPosition.speed.toFixed(1)} km/h</p>
//                     <p>Status: {currentPosition.status}</p>
//                     <p>
//                       Time:{" "}
//                       {new Date(currentPosition.timestamp).toLocaleTimeString()}
//                     </p>
//                   </div>
//                 </Popup>
//               </Marker>
//             )}

//             {/* Track line */}
//             {previousPoints.length > 1 && (
//               <Polyline
//                 positions={previousPoints.map((p) => [p.lat, p.lng])}
//                 color="blue"
//                 weight={3}
//               />
//             )}
//           </MapContainer>

//           {/* Playback controls overlay */}
//           <div className="absolute bottom-4 left-4 z-50 bg-white p-2 rounded-md shadow-md">
//             <div className="flex flex-col space-y-2">
//               <PlaybackControls
//                 onPlay={resumePlayback}
//                 onPause={pausePlayback}
//                 onReset={resetPlayback}
//                 onSpeedChange={changePlaybackSpeed}
//                 isPlaying={isPlaying}
//                 playbackSpeed={playbackSpeed}
//               />

//               <div className="w-full bg-gray-200 rounded-full h-2">
//                 <div
//                   className="bg-blue-600 h-2 rounded-full"
//                   style={{ width: `${playbackProgress}%` }}
//                 ></div>
//               </div>

//               {currentPosition && (
//                 <div className="text-xs flex items-center space-x-2">
//                   <div
//                     className={`w-3 h-3 rounded-full ${getMarkerColor(currentPosition.status)}`}
//                   ></div>
//                   <span>
//                     {currentPosition.status.charAt(0).toUpperCase() +
//                       currentPosition.status.slice(1)}
//                   </span>
//                   <span>{currentPosition.speed.toFixed(1)} km/h</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Table */}
//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead className="w-12"></TableHead>
//             <TableHead>Vehicle No.</TableHead>
//             <TableHead>Total Shift Hours</TableHead>
//             <TableHead>Kms. (Logbook)</TableHead>
//             <TableHead>Kms. (GPS)</TableHead>
//             <TableHead>Running Hours</TableHead>
//             <TableHead>Idle Time</TableHead>
//             <TableHead>Stopage Time</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {vehicleSummaries.map((summary: any) => {
//             const isExpanded = expandedRows.includes(summary.vehicleNumber);

//             return (
//               <React.Fragment key={summary.vehicleNumber}>
//                 <TableRow>
//                   <TableCell className="w-12">
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       onClick={() => toggleRow(summary.vehicleNumber)}
//                     >
//                       {isExpanded ? (
//                         <ChevronDown className="h-4 w-4" />
//                       ) : (
//                         <ChevronRight className="h-4 w-4" />
//                       )}
//                     </Button>
//                   </TableCell>
//                   <TableCell>{summary.vehicleNumber}</TableCell>
//                   <TableCell>{summary.totalShiftHours}</TableCell>
//                   <TableCell>{summary.totalKmsLogbook.toFixed(2)}</TableCell>
//                   <TableCell>{summary.totalKmsGPS.toFixed(2)}</TableCell>
//                   <TableCell>{summary.totalRunningHours}</TableCell>
//                   <TableCell>{summary.totalIdleTime}</TableCell>
//                   <TableCell>{summary.totalStopageTime}</TableCell>
//                 </TableRow>
//                 {isExpanded && (
//                   <TableRow
//                     key={`${summary.vehicleNumber}-details`}
//                     className="bg-gray-50"
//                   >
//                     <TableCell colSpan={8} className="p-0">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead>Sr. No</TableHead>
//                             <TableHead>Date</TableHead>
//                             <TableHead>Shift</TableHead>
//                             <TableHead>Start Time</TableHead>
//                             <TableHead>End Time</TableHead>
//                             <TableHead>Shift Hours</TableHead>
//                             <TableHead>Kms (Logbook)</TableHead>
//                             <TableHead>Kms (GPS)</TableHead>
//                             <TableHead>Running Hours</TableHead>
//                             <TableHead>Idle Time</TableHead>
//                             <TableHead>Stopage</TableHead>
//                             <TableHead>Playback</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {summary.records.map((record: any, index: any) => {
//                             const isActive =
//                               activePlayback ===
//                               `${summary.vehicleNumber}-${index}`;

//                             return (
//                               <TableRow
//                                 key={`${summary.vehicleNumber}-${index}`}
//                                 className={isActive ? "bg-blue-50" : ""}
//                               >
//                                 <TableCell>{record["Sr. No"]}</TableCell>
//                                 <TableCell>{record.Date}</TableCell>
//                                 <TableCell>{record["Day/Night"]}</TableCell>
//                                 <TableCell>{record["Start Time"]}</TableCell>
//                                 <TableCell>{record["End Time"]}</TableCell>
//                                 <TableCell>{record["Shift Hours"]}</TableCell>
//                                 <TableCell>
//                                   {record["Kms. As per Logbook"]}
//                                 </TableCell>
//                                 <TableCell>
//                                   {record["Kms. As per GPS System"]}
//                                 </TableCell>
//                                 <TableCell>
//                                   {record["Running hours."]}
//                                 </TableCell>
//                                 <TableCell>{record["Idel "]}</TableCell>
//                                 <TableCell>{record.Stopage}</TableCell>
//                                 <TableCell>
//                                   <Button
//                                     variant={isActive ? "secondary" : "outline"}
//                                     size="sm"
//                                     onClick={() => {
//                                       if (isActive) {
//                                         if (isPlaying) {
//                                           pausePlayback();
//                                         } else {
//                                           resumePlayback();
//                                         }
//                                       } else {
//                                         startPlayback(
//                                           summary.vehicleNumber,
//                                           index
//                                         );
//                                       }
//                                     }}
//                                   >
//                                     {isActive && isPlaying ? (
//                                       <Pause className="h-4 w-4 mr-1" />
//                                     ) : (
//                                       <Play className="h-4 w-4 mr-1" />
//                                     )}
//                                     {isActive
//                                       ? isPlaying
//                                         ? "Pause"
//                                         : "Resume"
//                                       : "Play"}
//                                   </Button>
//                                 </TableCell>
//                               </TableRow>
//                             );
//                           })}
//                         </TableBody>
//                       </Table>
//                       <div className="p-4">
//                         <p>
//                           <strong>Total Records:</strong>{" "}
//                           {summary.records.length}
//                         </p>
//                         <p>
//                           <strong>Total Shift Hours:</strong>{" "}
//                           {summary.totalShiftHours}
//                         </p>
//                         <p>
//                           <strong>Total Kilometers (Logbook):</strong>{" "}
//                           {summary.totalKmsLogbook.toFixed(2)} km
//                         </p>
//                         <p>
//                           <strong>Total Kilometers (GPS):</strong>{" "}
//                           {summary.totalKmsGPS.toFixed(2)} km
//                         </p>
//                       </div>
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </React.Fragment>
//             );
//           })}
//         </TableBody>
//       </Table>
//     </div>
//   );
// };

// export default EnhancedWorkHourSummary;

import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: "./truck2.png",
  iconSize: [20, 20],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Define types
interface ShiftRecord {
  "Sr. No": string;
  Date: string;
  "Day/Night": string;
  "Start Time": string;
  "End Time": string;
  "Shift Hours": string;
  "Kms. As per Logbook": string;
  "Kms. As per GPS System": string;
  "Running hours.": string;
  "Idel ": string;
  Stopage: string;
  "Veh. No": string;
  id?: string;
  // Adding GPS track data
  gpsTrack?: GpsPoint[];
}

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  status: "running" | "idle" | "stopped";
}

interface LocationPoint {
  "Start Datetime": string;
  "Start Location": string;
}

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

// Playback controller component
const PlaybackControls = ({
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  isPlaying,
  playbackSpeed,
}) => {
  return (
    <div className="flex items-center space-x-2 p-2 z-[99]">
      <Button variant="outline" size="sm" onClick={onReset}>
        <SkipBack className="h-4 w-4" />
      </Button>

      <Button
        variant={isPlaying ? "secondary" : "default"}
        size="sm"
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <select
        className="h-8 rounded-md border border-input px-2 text-sm"
        value={playbackSpeed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
      >
        <option value="1">1x</option>
        <option value="2">2x</option>
        <option value="5">5x</option>
        <option value="10">10x</option>
      </select>
    </div>
  );
};

// Sample path data
const samplePathData: LocationPoint[] = [
  {
    "Start Datetime": "07-07-2024 07:56:38 AM",
    "Start Location": "21.7645333,72.1652078",
  },
  {
    "Start Datetime": "07-07-2024 08:12:32 AM",
    "Start Location": "21.7646933,72.1652594",
  },
  {
    "Start Datetime": "07-07-2024 08:18:43 AM",
    "Start Location": "21.7651756,72.1645589",
  },
  {
    "Start Datetime": "07-07-2024 09:03:49 AM",
    "Start Location": "21.7653583,72.1643206",
  },
  {
    "Start Datetime": "07-07-2024 09:12:51 AM",
    "Start Location": "21.7651461,72.1644778",
  },
  {
    "Start Datetime": "07-07-2024 09:27:53 AM",
    "Start Location": "21.7662017,72.1629556",
  },
  {
    "Start Datetime": "07-07-2024 09:36:38 AM",
    "Start Location": "21.7670183,72.1617572",
  },
  {
    "Start Datetime": "07-07-2024 09:42:56 AM",
    "Start Location": "21.7674811,72.1610411",
  },
  {
    "Start Datetime": "07-07-2024 10:00:59 AM",
    "Start Location": "21.768205,72.1599372",
  },
  {
    "Start Datetime": "07-07-2024 10:13:01 AM",
    "Start Location": "21.7672883,72.1582617",
  },
  {
    "Start Datetime": "07-07-2024 10:22:02 AM",
    "Start Location": "21.7655767,72.1569211",
  },
  {
    "Start Datetime": "07-07-2024 10:37:04 AM",
    "Start Location": "21.7641961,72.1558583",
  },
  {
    "Start Datetime": "07-07-2024 10:46:06 AM",
    "Start Location": "21.76328,72.1551461",
  },
  {
    "Start Datetime": "07-07-2024 10:58:08 AM",
    "Start Location": "21.7621389,72.1542",
  },
  {
    "Start Datetime": "07-07-2024 11:13:07 AM",
    "Start Location": "21.7612044,72.1534967",
  },
  {
    "Start Datetime": "07-07-2024 11:19:11 AM",
    "Start Location": "21.75986,72.1525522",
  },
  {
    "Start Datetime": "07-07-2024 11:49:16 AM",
    "Start Location": "21.7587289,72.1524667",
  },
  {
    "Start Datetime": "07-07-2024 12:10:19 PM",
    "Start Location": "21.7558778,72.1530611",
  },
  {
    "Start Datetime": "07-07-2024 12:22:21 PM",
    "Start Location": "21.7551994,72.1538394",
  },
  {
    "Start Datetime": "07-07-2024 12:30:05 PM",
    "Start Location": "21.7550994,72.1552428",
  },
  {
    "Start Datetime": "07-07-2024 12:35:42 PM",
    "Start Location": "21.7550622,72.1554211",
  },
  {
    "Start Datetime": "07-07-2024 12:41:50 PM",
    "Start Location": "21.7550217,72.1566833",
  },
  {
    "Start Datetime": "07-07-2024 12:48:26 PM",
    "Start Location": "21.7549194,72.1584456",
  },
  {
    "Start Datetime": "07-07-2024 12:56:43 PM",
    "Start Location": "21.7548639,72.1602711",
  },
  {
    "Start Datetime": "07-07-2024 01:02:54 PM",
    "Start Location": "21.7547683,72.1609056",
  },
  {
    "Start Datetime": "07-07-2024 01:10:32 PM",
    "Start Location": "21.7551333,72.16178",
  },
  {
    "Start Datetime": "07-07-2024 01:17:56 PM",
    "Start Location": "21.7550389,72.1616161",
  },
  {
    "Start Datetime": "07-07-2024 01:30:45 PM",
    "Start Location": "21.7543794,72.1616",
  },
  {
    "Start Datetime": "07-07-2024 01:38:20 PM",
    "Start Location": "21.7551778,72.1613994",
  },
  {
    "Start Datetime": "07-07-2024 01:51:01 PM",
    "Start Location": "21.7593328,72.1574422",
  },
  {
    "Start Datetime": "07-07-2024 02:35:39 PM",
    "Start Location": "21.7631078,72.1511456",
  },
  {
    "Start Datetime": "07-07-2024 02:44:24 PM",
    "Start Location": "21.7628233,72.1511706",
  },
  {
    "Start Datetime": "07-07-2024 03:06:14 PM",
    "Start Location": "21.7553506,72.1487094",
  },
  {
    "Start Datetime": "07-07-2024 03:15:32 PM",
    "Start Location": "21.7566311,72.1483972",
  },
  {
    "Start Datetime": "07-07-2024 03:27:17 PM",
    "Start Location": "21.7589117,72.1460717",
  },
  {
    "Start Datetime": "07-07-2024 03:44:36 PM",
    "Start Location": "21.7644706,72.1473072",
  },
  {
    "Start Datetime": "07-07-2024 03:58:59 PM",
    "Start Location": "21.7696017,72.1469922",
  },
  {
    "Start Datetime": "07-07-2024 04:14:39 PM",
    "Start Location": "21.7692083,72.1424894",
  },
  {
    "Start Datetime": "07-07-2024 04:19:20 PM",
    "Start Location": "21.7684267,72.1414061",
  },
  {
    "Start Datetime": "07-07-2024 04:30:28 PM",
    "Start Location": "21.7678389,72.1389661",
  },
  {
    "Start Datetime": "07-07-2024 04:43:58 PM",
    "Start Location": "21.7673611,72.1374528",
  },
  {
    "Start Datetime": "07-07-2024 04:57:32 PM",
    "Start Location": "21.7672828,72.1340506",
  },
  {
    "Start Datetime": "07-07-2024 05:06:35 PM",
    "Start Location": "21.7683389,72.1342272",
  },
  {
    "Start Datetime": "07-07-2024 05:15:35 PM",
    "Start Location": "21.7695567,72.1332644",
  },
  {
    "Start Datetime": "07-07-2024 05:27:43 PM",
    "Start Location": "21.7713533,72.1339061",
  },
  {
    "Start Datetime": "07-07-2024 05:33:42 PM",
    "Start Location": "21.7720167,72.1345011",
  },
  {
    "Start Datetime": "07-07-2024 05:39:41 PM",
    "Start Location": "21.7726017,72.135095",
  },
  {
    "Start Datetime": "07-07-2024 05:48:40 PM",
    "Start Location": "21.7734372,72.13625",
  },
  {
    "Start Datetime": "07-07-2024 06:12:44 PM",
    "Start Location": "21.7743161,72.1383411",
  },
  {
    "Start Datetime": "07-07-2024 06:24:46 PM",
    "Start Location": "21.7736733,72.1385517",
  },
  {
    "Start Datetime": "07-07-2024 06:39:48 PM",
    "Start Location": "21.7717939,72.1391256",
  },
  {
    "Start Datetime": "07-07-2024 06:46:35 PM",
    "Start Location": "21.7721939,72.1400628",
  },
  {
    "Start Datetime": "07-07-2024 06:52:54 PM",
    "Start Location": "21.7727378,72.1407056",
  },
  {
    "Start Datetime": "07-07-2024 06:58:55 PM",
    "Start Location": "21.773325,72.1413544",
  },
  {
    "Start Datetime": "07-07-2024 07:05:56 PM",
    "Start Location": "21.7738878,72.1419733",
  },
  {
    "Start Datetime": "07-07-2024 07:12:53 PM",
    "Start Location": "21.7738078,72.1431883",
  },
  {
    "Start Datetime": "07-07-2024 07:21:57 PM",
    "Start Location": "21.774365,72.1425656",
  },
  {
    "Start Datetime": "07-07-2024 07:42:58 PM",
    "Start Location": "21.7751833,72.1426033",
  },
  {
    "Start Datetime": "07-07-2024 07:51:38 PM",
    "Start Location": "21.7744078,72.1429828",
  },
  {
    "Start Datetime": "07-07-2024 08:08:49 PM",
    "Start Location": "21.77275,72.1344056",
  },
  {
    "Start Datetime": "07-07-2024 08:20:03 PM",
    "Start Location": "21.7674361,72.1303561",
  },
  {
    "Start Datetime": "07-07-2024 08:35:59 PM",
    "Start Location": "21.77804,72.1457406",
  },
  {
    "Start Datetime": "07-07-2024 08:48:01 PM",
    "Start Location": "21.7791761,72.145685",
  },
  {
    "Start Datetime": "07-07-2024 08:57:17 PM",
    "Start Location": "21.7803378,72.1456772",
  },
  {
    "Start Datetime": "07-07-2024 09:05:23 PM",
    "Start Location": "21.7794833,72.1458933",
  },
  {
    "Start Datetime": "07-07-2024 09:09:15 PM",
    "Start Location": "21.7779972,72.1458767",
  },
  {
    "Start Datetime": "07-07-2024 09:37:38 PM",
    "Start Location": "21.7765933,72.1494533",
  },
];

// Main component
const EnhancedWorkHourSummary = ({
  vehicleSummaries,
  expandedRows,
  toggleRow,
}) => {
  const [activePlayback, setActivePlayback] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [trackPoints, setTrackPoints] = useState<GpsPoint[]>([]);
  const [previousPoints, setPreviousPoints] = useState<GpsPoint[]>([]);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef(null);

  // Convert location string to coordinates
  const parseLocationString = (locationStr: string): [number, number] => {
    const [lat, lng] = locationStr.split(",").map(Number);
    return [lat, lng];
  };

  // Generate GPS data from location points
  const generateGpsTrackFromLocations = (
    locations: LocationPoint[],
    startTime: Date,
    endTime: Date
  ): GpsPoint[] => {
    const track: GpsPoint[] = [];
    const totalDuration = endTime.getTime() - startTime.getTime();

    locations.forEach((location, index) => {
      const progress = index / (locations.length - 1);
      const timestamp = new Date(
        startTime.getTime() + progress * totalDuration
      );

      const [lat, lng] = parseLocationString(location["Start Location"]);

      // Determine status based on speed and position in track
      let status: "running" | "idle" | "stopped" = "running";
      let speed = 20 + Math.random() * 30; // Random speed when running

      // Simulate idle and stopped periods
      if (index > 0 && index < locations.length - 1) {
        // Every 4th point is idle
        if (index % 4 === 0) {
          status = "idle";
          speed = 0;
        }
        // Every 7th point is stopped
        else if (index % 7 === 0) {
          status = "stopped";
          speed = 0;
        }
      }

      track.push({
        lat,
        lng,
        timestamp: timestamp.toISOString(),
        speed,
        status,
      });
    });

    return track;
  };

  // Convert path data to GPS track for each record
  useEffect(() => {
    vehicleSummaries.forEach((summary) => {
      summary.records.forEach((record) => {
        if (!record.gpsTrack) {
          // Parse dates from record
          const dateParts = record.Date.split("/");
          const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;

          // Ensure time strings have proper format (HH:MM)
          const formatTimeString = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(":");
            return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
          };

          const startTime = new Date(
            `${formattedDate}T${formatTimeString(record["Start Time"])}`
          );
          const endTime = new Date(
            `${formattedDate}T${formatTimeString(record["End Time"])}`
          );

          // Handle cases where end time is on the next day
          if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
          }

          // Generate track from sample locations
          record.gpsTrack = generateGpsTrackFromLocations(
            samplePathData,
            startTime,
            endTime
          );
        }
      });
    });
  }, [vehicleSummaries]);

  const startPlayback = (vehicleNumber: string, recordIndex: number) => {
    // Stop any existing playback
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }

    const summary = vehicleSummaries.find(
      (s) => s.vehicleNumber === vehicleNumber
    );
    if (!summary) return;

    const record = summary.records[recordIndex];
    const track = record.gpsTrack;

    if (!track || track.length === 0) {
      console.error("No GPS track available for this record");
      return;
    }

    setActivePlayback(`${vehicleNumber}-${recordIndex}`);
    setTrackPoints(track);
    setPreviousPoints([]);
    setCurrentPosition(track[0]);
    setPlaybackProgress(0);
    setIsPlaying(true);

    // Start playback timer
    const intervalTime = 1000 / playbackSpeed;
    let currentIndex = 0;

    playbackTimerRef.current = setInterval(() => {
      if (currentIndex < track.length - 1) {
        currentIndex++;
        setCurrentPosition(track[currentIndex]);
        setPreviousPoints(track.slice(0, currentIndex + 1));
        setPlaybackProgress(
          Math.round((currentIndex / (track.length - 1)) * 100)
        );
      } else {
        // End of track
        setIsPlaying(false);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      }
    }, intervalTime);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
  };

  const resumePlayback = () => {
    if (!activePlayback || !currentPosition) return;

    setIsPlaying(true);

    const [vehicleNumber, recordIndex] = activePlayback.split("-");
    const summary = vehicleSummaries.find(
      (s) => s.vehicleNumber === vehicleNumber
    );
    if (!summary) return;

    const record = summary.records[parseInt(recordIndex)];
    const track = record.gpsTrack;

    if (!track || track.length === 0) return;

    // Find current index
    const currentIndex = track.findIndex(
      (p) => p.lat === currentPosition.lat && p.lng === currentPosition.lng
    );

    if (currentIndex === -1 || currentIndex >= track.length - 1) return;

    // Resume playback
    const intervalTime = 1000 / playbackSpeed;
    let index = currentIndex;

    playbackTimerRef.current = setInterval(() => {
      if (index < track.length - 1) {
        index++;
        setCurrentPosition(track[index]);
        setPreviousPoints(track.slice(0, index + 1));
        setPlaybackProgress(Math.round((index / (track.length - 1)) * 100));
      } else {
        // End of track
        setIsPlaying(false);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      }
    }, intervalTime);
  };

  const resetPlayback = () => {
    if (!activePlayback) return;

    const [vehicleNumber, recordIndex] = activePlayback.split("-");
    const summary = vehicleSummaries.find(
      (s) => s.vehicleNumber === vehicleNumber
    );
    if (!summary) return;

    const record = summary.records[parseInt(recordIndex)];
    const track = record.gpsTrack;

    if (!track || track.length === 0) return;

    // Reset to beginning
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }

    setCurrentPosition(track[0]);
    setPreviousPoints([track[0]]);
    setPlaybackProgress(0);
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);

    // If currently playing, restart with new speed
    if (isPlaying) {
      pausePlayback();
      setTimeout(() => resumePlayback(), 50);
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, []);

  const getMarkerColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      case "stopped":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };
  const getMarkerColorHex = (status: string) => {
    switch (status) {
      case "running":
        return "22c55e";
      case "idle":
        return "eab308";
      case "stopped":
        return "ef4444";
      default:
        return "3b82f6";
    }
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Map Container - only shown when playback is active */}
      {activePlayback && (
        <div className="w-full h-96 border rounded-md mb-4 relative">
          <div className="w-full h-96 border rounded-md mb-4 relative z-50">
            <MapContainer
              center={
                currentPosition
                  ? [currentPosition.lat, currentPosition.lng]
                  : [21.78574, 72.1524611]
              }
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Current position marker */}
              {currentPosition && (
                <Marker position={[currentPosition.lat, currentPosition.lng]}>
                  <Popup>
                    <div>
                      <p className="font-bold">Current Position</p>
                      <p>Speed: {currentPosition.speed.toFixed(1)} km/h</p>
                      <p>Status: {currentPosition.status}</p>
                      <p>
                        Time:{" "}
                        {new Date(
                          currentPosition.timestamp
                        ).toLocaleTimeString()}
                      </p>
                      <p>
                        Location: {currentPosition.lat.toFixed(6)},{" "}
                        {currentPosition.lng.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Track line */}
              {previousPoints.length > 1 && currentPosition && (
                <Polyline
                  positions={previousPoints.map((p) => [p.lat, p.lng])}
                  color={`#${getMarkerColorHex(currentPosition.status)}`}
                  weight={3}
                />
              )}
            </MapContainer>
          </div>

          {/* Playback controls overlay */}
          <div className="absolute bottom-4 left-4 z-50 bg-white p-2 rounded-md shadow-md z-50">
            <div className="flex flex-col space-y-2">
              <PlaybackControls
                onPlay={resumePlayback}
                onPause={pausePlayback}
                onReset={resetPlayback}
                onSpeedChange={changePlaybackSpeed}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
              />

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${playbackProgress}%` }}
                ></div>
              </div>

              {currentPosition && (
                <div className="text-xs flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getMarkerColor(currentPosition.status)}`}
                  ></div>
                  <span>
                    {currentPosition.status.charAt(0).toUpperCase() +
                      currentPosition.status.slice(1)}
                  </span>
                  <span>{currentPosition.speed.toFixed(1)} km/h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Vehicle No.</TableHead>
            <TableHead>Total Shift Hours</TableHead>
            <TableHead>Kms. (Logbook)</TableHead>
            <TableHead>Kms. (GPS)</TableHead>
            <TableHead>Running Hours</TableHead>
            <TableHead>Idle Time</TableHead>
            <TableHead>Stopage Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicleSummaries.map((summary) => {
            const isExpanded = expandedRows.includes(summary.vehicleNumber);

            return (
              <React.Fragment key={summary.vehicleNumber}>
                <TableRow>
                  <TableCell className="w-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRow(summary.vehicleNumber)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>{summary.vehicleNumber}</TableCell>
                  <TableCell>{summary.totalShiftHours}</TableCell>
                  <TableCell>{summary.totalKmsLogbook.toFixed(2)}</TableCell>
                  <TableCell>{summary.totalKmsGPS.toFixed(2)}</TableCell>
                  <TableCell>{summary.totalRunningHours}</TableCell>
                  <TableCell>{summary.totalIdleTime}</TableCell>
                  <TableCell>{summary.totalStopageTime}</TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow
                    key={`${summary.vehicleNumber}-details`}
                    className="bg-gray-50"
                  >
                    <TableCell colSpan={8} className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sr. No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Shift</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Shift Hours</TableHead>
                            <TableHead>Kms (Logbook)</TableHead>
                            <TableHead>Kms (GPS)</TableHead>
                            <TableHead>Running Hours</TableHead>
                            <TableHead>Idle Time</TableHead>
                            <TableHead>Stopage</TableHead>
                            <TableHead>Playback</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.records.map((record, index) => {
                            const isActive =
                              activePlayback ===
                              `${summary.vehicleNumber}-${index}`;

                            return (
                              <TableRow
                                key={`${summary.vehicleNumber}-${index}`}
                                className={isActive ? "bg-blue-50" : ""}
                              >
                                <TableCell>{record["Sr. No"]}</TableCell>
                                <TableCell>{record.Date}</TableCell>
                                <TableCell>{record["Day/Night"]}</TableCell>
                                <TableCell>{record["Start Time"]}</TableCell>
                                <TableCell>{record["End Time"]}</TableCell>
                                <TableCell>{record["Shift Hours"]}</TableCell>
                                <TableCell>
                                  {record["Kms. As per Logbook"]}
                                </TableCell>
                                <TableCell>
                                  {record["Kms. As per GPS System"]}
                                </TableCell>
                                <TableCell>
                                  {record["Running hours."]}
                                </TableCell>
                                <TableCell>{record["Idel "]}</TableCell>
                                <TableCell>{record.Stopage}</TableCell>
                                <TableCell>
                                  <Button
                                    variant={isActive ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      if (isActive) {
                                        if (isPlaying) {
                                          pausePlayback();
                                        } else {
                                          resumePlayback();
                                        }
                                      } else {
                                        startPlayback(
                                          summary.vehicleNumber,
                                          index
                                        );
                                      }
                                    }}
                                  >
                                    {isActive && isPlaying ? (
                                      <Pause className="h-4 w-4 mr-1" />
                                    ) : (
                                      <Play className="h-4 w-4 mr-1" />
                                    )}
                                    {isActive
                                      ? isPlaying
                                        ? "Pause"
                                        : "Resume"
                                      : "Play"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      <div className="p-4">
                        <p>
                          <strong>Total Records:</strong>{" "}
                          {summary.records.length}
                        </p>
                        <p>
                          <strong>Total Shift Hours:</strong>{" "}
                          {summary.totalShiftHours}
                        </p>
                        <p>
                          <strong>Total Kilometers (Logbook):</strong>{" "}
                          {summary.totalKmsLogbook.toFixed(2)} km
                        </p>
                        <p>
                          <strong>Total Kilometers (GPS):</strong>{" "}
                          {summary.totalKmsGPS.toFixed(2)} km
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default EnhancedWorkHourSummary;
