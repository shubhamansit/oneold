import { FC, useState } from "react";
import { Button } from "./ui/button";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { format, parse } from "date-fns";

// Define the trip interface (matching your data structure)
interface Trip {
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

interface ExportExcelProps {
  data: VehicleData[];
  exportMode: "summary" | "details";
}

const ExportExcel: FC<ExportExcelProps> = ({ data, exportMode }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!data || data.length === 0 || !Object.keys(data[0]).length) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        exportMode === "summary"
          ? "Work Hour Summary"
          : "Work Hour Summary Details"
      );

      // Add company logo (optional, adjust path as needed)
      const logoId = workbook.addImage({
        base64: await getBase64Image("/image.png"),
        extension: "png",
      });
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 70, height: 70 },
      });

      // Add Report Title and Duration
      worksheet.mergeCells("A1:J1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "Work Hour Summary";
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: "center" };

      worksheet.mergeCells("A2:J2");
      const durationCell = worksheet.getCell("A2");
      durationCell.value =
        "Duration: from 07-07-2024 12:00:00 AM to 27-07-2024 11:59:00 PM";
      durationCell.font = { size: 12, italic: true };
      durationCell.alignment = { horizontal: "center" };

      // Add Summary Data
      let currentRow = 4;
      const summaryHeaders = [
        "Distance",
        "Working Duration",
        "Company",
        "Branch",
        "Object",
        "Vehicle Brand",
        "Vehicle Model",
        "Driver",
        "Distance",
        "Working Duration",
      ];

      worksheet.addRow(summaryHeaders);
      worksheet.getRow(currentRow).font = { bold: true };
      currentRow++;

      // Process each vehicle in the data
      data.forEach((vehicleObj) => {
        Object.entries(vehicleObj).forEach(([vehicleNumber, trips]) => {
          if (!Array.isArray(trips) || trips.length === 0) return;

          // Calculate totals
          const totalDistance = trips
            .reduce((sum, trip) => sum + parseFloat(trip.Distance || "0"), 0)
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

          const summaryRow = [
            totalDistance,
            formattedDuration,
            "BMCSWIPPER",
            "BMCSWIPPER",
            vehicleNumber,
            "Ambulance",
            "12e2r3",
            trips[0].Driver,
            totalDistance,
            formattedDuration,
          ];
          worksheet.addRow(summaryRow);
          currentRow++;

          if (exportMode === "details" && trips.length > 0) {
            currentRow += 2; // Add some space
            worksheet.getCell(`A${currentRow}`).value = `${vehicleNumber}`;
            worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
            currentRow++;

            const detailHeaders = [
              "Start Datetime",
              "Start Location",
              "End Datetime",
              "End Location",
              "Driver",
              "Employee No",
              "Distance",
              "Working Duration",
            ];
            worksheet.addRow(detailHeaders);
            worksheet.getRow(currentRow).font = { bold: true };
            currentRow++;

            trips.forEach((trip) => {
              const detailRow = [
                format(
                  parse(
                    trip["Start Datetime"],
                    "yyyy-MM-dd HH:mm:ss",
                    new Date()
                  ),
                  "dd-MM-yyyy HH:mm:ss a"
                ),
                trip["Start Location"],
                format(
                  parse(
                    trip["End Datetime"],
                    "yyyy-MM-dd HH:mm:ss",
                    new Date()
                  ),
                  "dd-MM-yyyy HH:mm:ss a"
                ),
                trip["End Location"],
                trip.Driver,
                trip["Employee No"],
                trip.Distance,
                trip["Working Duration"],
              ];
              worksheet.addRow(detailRow);
              currentRow++;
            });

            currentRow += 2; // Add some space after details
          }
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        // @ts-ignore
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 15 ? 15 : maxLength; // Increased minimum width for readability
      });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `${
          exportMode === "summary"
            ? "Work Hour Summary"
            : "Work Hour Summary Details"
        }.xlsx`
      );

      toast.success(
        `${
          exportMode === "summary" ? "Summary" : "Detailed"
        } report exported successfully`
      );
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("Failed to export Excel file");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      className="w-full h-full hover:bg-zinc-900 bg-[#DB4848]"
      onClick={handleExportExcel}
      disabled={isExporting}
    >
      {isExporting
        ? "Exporting..."
        : exportMode === "summary"
        ? "Summary"
        : "Details With Summary"}
    </Button>
  );
};

export default ExportExcel;

// Utility function to get base64 of an image
async function getBase64Image(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
