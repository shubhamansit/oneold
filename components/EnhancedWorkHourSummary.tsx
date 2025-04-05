"useclient";
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
import {
  samplePathData0108,
  samplePathData0399,
  samplePathData3619,
  samplePathData3991,
} from "@/data/vehiclePath";

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
  // @ts-ignore
  onPlay,
  // @ts-ignore
  onPause,
  // @ts-ignore
  onReset,
  // @ts-ignore
  onSpeedChange,
  // @ts-ignore
  isPlaying,
  // @ts-ignore
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
        value={playbackSpeed / 100}
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

// Main component
const EnhancedWorkHourSummary = ({
  // @ts-ignore
  vehicleSummaries,
  // @ts-ignore
  expandedRows,
  // @ts-ignore
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
        timestamp: timestamp?.toISOString(),
        speed,
        status,
      });
    });

    return track;
  };

  // Convert path data to GPS track for each record
  useEffect(() => {
    // @ts-ignore
    console.log(vehicleSummaries);
    // @ts-ignore
    vehicleSummaries.forEach((summary) => {
      // @ts-ignore
      summary.records.forEach((record) => {
        if (!record.gpsTrack) {
          // Parse dates from record
          const dateParts = record.Date.split("/");
          const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;

          // Ensure time strings have proper format (HH:MM)
          const formatTimeString = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(":");
            return `${hours?.padStart(2, "0")}:${minutes?.padStart(2, "0")}`;
          };
          if (record["Start Time"] != "--") {
            const startTime = new Date(
              `${formattedDate}T${formatTimeString(record["Start Time"])}`
            );
            const endTime = new Date(
              `${formattedDate}T${formatTimeString(record["End Time"])}`
            );
            if (endTime < startTime) {
              endTime.setDate(endTime.getDate() + 1);
            }

            if (record["Veh. No"] == "GJ-06-JF-3619") {
              record.gpsTrack = generateGpsTrackFromLocations(
                samplePathData3619,
                startTime,
                endTime
              );
            }
            if (record["Veh. No"] == "GJ-04-GB-0399") {
              record.gpsTrack = generateGpsTrackFromLocations(
                samplePathData0399,
                startTime,
                endTime
              );
            }
            if (record["Veh. No"] == "GJ-04-GB-0108") {
              record.gpsTrack = generateGpsTrackFromLocations(
                samplePathData0108,
                startTime,
                endTime
              );
            }
            if (record["Veh. No"] == "GJ-06-JF-3991") {
              record.gpsTrack = generateGpsTrackFromLocations(
                samplePathData3991,
                startTime,
                endTime
              );
            }
          }

          // Handle cases where end time is on the next day
          // Generate track from sample locations
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
      (s: any) => s.vehicleNumber === vehicleNumber
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

    // const [vehicleNumber, recordIndex] = activePlayback.split("-");

    const vehicleNumberarr = activePlayback.split("-");
    const recordIndex = vehicleNumberarr[4];

    const summary = vehicleSummaries.find(
      (s: any) =>
        s.vehicleNumber ===
        vehicleNumberarr[0] +
          "-" +
          vehicleNumberarr[1] +
          "-" +
          vehicleNumberarr[2] +
          "-" +
          vehicleNumberarr[3]
    );
    if (!summary) return;

    const record = summary.records[parseInt(recordIndex)];
    const track = record.gpsTrack;

    if (!track || track.length === 0) return;

    // Find current index
    const currentIndex = track.findIndex(
      (p: any) => p.lat === currentPosition.lat && p.lng === currentPosition.lng
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
      (s: any) => s.vehicleNumber === vehicleNumber
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
    setPlaybackSpeed(speed * 100);

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
                attribution="ANS IT INDIA"
              />

              {/* Current position marker */}
              {currentPosition && (
                <Marker position={[currentPosition.lat, currentPosition.lng]}>
                  <Popup>
                    <div>
                      <p className="font-bold">Current Position</p>
                      <p>
                        Speed: {(currentPosition.speed / 6).toFixed(1)} km/h
                      </p>
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
          <div className="absolute bottom-4 left-4 bg-white p-2 rounded-md shadow-md z-50">
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
                  <span>{(currentPosition.speed / 6).toFixed(1)} km/h</span>
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
            <TableHead>Kms. (GPS)</TableHead>
            <TableHead>Running Hours</TableHead>
            <TableHead>Idle Time</TableHead>
            <TableHead>Stopage Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicleSummaries.map((summary: any) => {
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
                          {summary.records.map((record: any, index: any) => {
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
                                    disabled={record["Start Time"] == "--"}
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
