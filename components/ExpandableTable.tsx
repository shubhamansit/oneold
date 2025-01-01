"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { wastZone } from "@/data/index2";

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
  "Assigned Helpers": number;
  more_details: MoreDetails[];
}

interface MoreDetails {
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

export default function ExpandableTable({ data }: { data: typeof wastZone }) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  function findMissedCheckPoints(moreDetails: MoreDetails[]) {
    let count = 0;
    for (let index = 0; index < moreDetails.length; index++) {
      if (moreDetails[index]["Checkpoints Complete Status(%)"] == 100) {
        count++;
      }
    }
    return count;
  }

  return (
    <div className="container mx-auto py-10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch</TableHead>
            <TableHead>Town</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Ward</TableHead>
            <TableHead>Job Name</TableHead>
            <TableHead>Job Type</TableHead>
            <TableHead>Total Jobs</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Completed With Issue</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead>Penalty</TableHead>
            <TableHead>Assigned Helpers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <>
              <TableRow key={index}>
                <TableCell
                  className="h-8 w-8 p-0 underline cursor-pointer text-center"
                  onClick={() => toggleRow(index)}
                >
                  {row.Branch}
                </TableCell>
                <TableCell>{row.Town}</TableCell>
                <TableCell>{row.Zone}</TableCell>
                <TableCell>{row.Ward}</TableCell>
                <TableCell>{row["Job Name"]}</TableCell>
                <TableCell>{row["Job Type"]}</TableCell>
                <TableCell>{row["more_details"].length}</TableCell>
                <TableCell>
                  {findMissedCheckPoints(row["more_details"])}
                </TableCell>
                <TableCell>
                  {row["more_details"].length -
                    findMissedCheckPoints(row["more_details"])}
                </TableCell>
                <TableCell>{row.Failed}</TableCell>
                <TableCell>{row.Penalty}</TableCell>
                <TableCell>{row["Assigned Helpers"]}</TableCell>
              </TableRow>
              {expandedRows.includes(index) && (
                <TableRow key={index}>
                  <TableCell colSpan={13}>
                    <div className="p-4 bg-muted rounded-md">
                      <h3 className="text-lg font-semibold mb-2">
                        More Details
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(row.more_details[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {row.more_details.map((detail, detailIndex) => (
                            <TableRow key={detailIndex}>
                              {Object.values(detail).map(
                                (value, valueIndex) => (
                                  <TableCell key={valueIndex}>
                                    {value || "--"}
                                  </TableCell>
                                )
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
