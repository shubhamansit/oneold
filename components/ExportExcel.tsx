import { FC, useState } from "react";
import { Button } from "./ui/button";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface JobData {
  Branch: string;
  Town: string;
  Zone: string;
  Ward: string;
  "Job Name": string;
  "Job Type": string;
  "Total Jobs": number;
  Completed: number;
  "Completed With Issue": number;
  Failed: number;
  Penalty: number;
  "Assigned Helpers": string;
  Incidents: number;
  more_details: MoreDetails[];
}

interface MoreDetails {
  Status: string;
  Date: string;
  Vehicle: string;
  "Start Time": string;
  "End Time": string;
  "Actual Start Time": string;
  "Actual End Time": string;
  "Planned Checkpoints": number;
  "On-Time": number;
  Early: number;
  Delay: number;
  "Total Visited Checkpoints": number;
  "Missed Checkpoints": number;
  "Checkpoints Complete Status(%)": number;
  "Estimated Distance": number;
  Distance: number;
  "Distance Completed %": number;
  "On Route": number;
  "On Route %": number;
  "Off Route": number;
  "Off Route %": number;
  "Early Arrival Condition(Minute)": string;
  "Delay Arrival Condition(Minute)": string;
  "Group Name": string;
  Penalty: number;
  Reason: string;
  Remark: string;
  Assigned: string;
  Present: string;
  "Waste Weight": number;
  Incidents: number;
}

interface ExportExcelProps {
  data: JobData[];
  exportMode: "summary" | "details";
}

const ExportExcel: FC<ExportExcelProps> = ({ data, exportMode }) => {
  const [isExporting, setIsExporting] = useState(false);
  function findMissedCheckPoints(moreDetails: MoreDetails[]) {
    let count = 0;
    for (let index = 0; index < moreDetails.length; index++) {
      if (moreDetails[index]["Checkpoints Complete Status(%)"] == 100) {
        count++;
      }
    }
    return count;
  }
  const handleExportExcel = async () => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        exportMode === "summary"
          ? "Summary Report"
          : "Detail With Summary Report"
      );

      // Add company logo
      const logoId = workbook.addImage({
        base64: await getBase64Image("/image.png"),
        extension: "png",
      });
      worksheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 70, height: 70 },
      });

      // Add Company Name
      worksheet.mergeCells("B1:D2");
      const companyNameCell = worksheet.getCell("B1");
      companyNameCell.value = "ANS IT INDIA PVT LTD.";
      companyNameCell.font = { size: 20, bold: true };
      companyNameCell.alignment = { vertical: "middle", horizontal: "center" };

      // Add Report Title
      worksheet.mergeCells("A4:G4");
      const titleCell = worksheet.getCell("A4");
      titleCell.value =
        exportMode === "summary"
          ? "Summary Report"
          : "Detail With Summary Report";
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: "center" };

      // Add Summary Data
      let currentRow = 6;
      const summaryHeaders = [
        "Branch",
        "Town",
        "Zone",
        "Ward",
        "Job Name",
        "Job Type",
        "Total Jobs",
        "Completed",
        "Completed With Issue",
        "Failed",
        "Penalty",
        "Assigned Helpers",
        "Incidents",
      ];

      worksheet.addRow(summaryHeaders);
      worksheet.getRow(currentRow).font = { bold: true };
      currentRow++;

      data.forEach((job) => {
        const summaryRow = [
          job.Branch,
          job.Town,
          job.Zone,
          job.Ward,
          job["Job Name"],
          job["Job Type"],
          job.more_details.length,
          findMissedCheckPoints(job["more_details"]),
          job["more_details"].length -
            findMissedCheckPoints(job["more_details"]),
          job.Failed,
          job.Penalty,
          job["Assigned Helpers"],
          job.Incidents,
        ];
        worksheet.addRow(summaryRow);
        currentRow++;

        if (
          exportMode === "details" &&
          job.more_details &&
          job.more_details.length > 0
        ) {
          currentRow += 2; // Add some space between summary and details
          worksheet.getCell(`A${currentRow}`).value =
            "Detailed Job Information";
          worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
          currentRow++;

          const detailHeaders = Object.keys(job.more_details[0]);
          worksheet.addRow(detailHeaders);
          worksheet.getRow(currentRow).font = { bold: true };
          currentRow++;

          job.more_details.forEach((detail) => {
            const detailRow = Object.values(detail);
            worksheet.addRow(detailRow);
            currentRow++;
          });

          currentRow += 2; // Add some space after details
        }
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        //@ts-ignore
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
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
            ? "Summary Report"
            : "Detail With Summary Report"
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
