import React, { useState } from "react";
import { JobData } from "@/types/filtersType";
import { Button } from "@/components/ui/button";
import ExportExcel from "./ExportExcel";
import { DataDisplay } from "./data-display";

interface JobDataManagerProps {
  data: JobData[];
}

export const JobDataManager: React.FC<JobDataManagerProps> = ({ data }) => {
  const [displayMode, setDisplayMode] = useState<"summary" | "details">(
    "summary"
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setDisplayMode("summary")}
          variant={displayMode === "summary" ? "default" : "outline"}
        >
          Summary
        </Button>
        <Button
          onClick={() => setDisplayMode("details")}
          variant={displayMode === "details" ? "default" : "outline"}
        >
          Details
        </Button>
        <ExportExcel data={data} exportMode={displayMode} />
      </div>
      <DataDisplay data={data} displayMode={displayMode} />
    </div>
  );
};
