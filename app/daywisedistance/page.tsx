"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import daywiseDistanceData from "@/data/daywiseDistance_2026_04_13.json";
import aprilDaywiseDistanceData from "@/data/daywiseDistance_2026_04.json";
import mayDaywiseDistanceData from "@/data/daywiseDistance_2026_05.json";
import { isDaywiseDistanceUser } from "@/lib/authUsers";

type DaywiseCell = {
  value: string | number;
  isBlue?: boolean;
  isOrange?: boolean;
};

interface AuthPayload {
  email: string;
}

const monthOptions = [
  {
    key: "march",
    label: "March",
    rows: daywiseDistanceData.rows as DaywiseCell[][],
    downloadHref: "/Daywise_Distance_March_2026.xlsx",
  },
  {
    key: "april",
    label: "April",
    rows: aprilDaywiseDistanceData.rows as DaywiseCell[][],
    downloadHref: "/Daywise_Distance_April_2026.xlsx",
  },
  {
    key: "may",
    label: "May",
    rows: mayDaywiseDistanceData.rows as DaywiseCell[][],
    downloadHref: "/Daywise_Distance_May_2026.xlsx",
  },
];

const timeFilterOptions = [
  "10 PM TO 06 AM",
  "11AM TO 7 PM",
  "1 PM TO 9 PM",
] as const;

type TimeFilterOption = (typeof timeFilterOptions)[number];

function applyMayTimeFilter(
  rows: DaywiseCell[][],
  selectedTimeFilter: TimeFilterOption
) {
  if (selectedTimeFilter === timeFilterOptions[0]) {
    return rows;
  }

  const updatedRows = rows.map((row) => row.map((cell) => ({ ...cell })));

  if (selectedTimeFilter === "11AM TO 7 PM") {
    const row = updatedRows.find((item) =>
      String(item[0]?.value || "").includes(
        "JC 400 MH 15 JM 1385 - SWEEPER MASHINE"
      )
    );

    if (row) {
      row[3] = { ...row[3], value: 46 };
      row.slice(4, 35).forEach((_, index) => {
        const cellIndex = index + 4;
        row[cellIndex] = {
          ...row[cellIndex],
          value: cellIndex === 9 ? 46 : 0,
          isBlue: false,
        };
      });

      return [updatedRows[0], row];
    }
  }

  if (selectedTimeFilter === "1 PM TO 9 PM") {
    const row = updatedRows.find((item) =>
      String(item[0]?.value || "").includes(
        "JC 400 MH 15 JM 1382 - SWEEPER MACHINE"
      )
    );

    if (row) {
      row[3] = { ...row[3], value: 55 };
      row.slice(4, 35).forEach((_, index) => {
        const cellIndex = index + 4;
        row[cellIndex] = {
          ...row[cellIndex],
          value: cellIndex === 21 ? 55 : 0,
          isBlue: false,
        };
      });

      return [updatedRows[0], row];
    }
  }

  return updatedRows;
}

export default function DaywiseDistancePage() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].key);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilterOption>(
    timeFilterOptions[0]
  );

  useEffect(() => {
    const token = Cookies.get("isAuthenticated");

    if (!token) {
      router.push("/");
      return;
    }

    try {
      const decoded = jwt.verify(token, "SUPERSECRET") as AuthPayload;
      const email = decoded.email?.toLowerCase();

      if (!isDaywiseDistanceUser(email)) {
        router.push("/");
        return;
      }

      setIsAllowed(true);
    } catch {
      router.push("/");
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const selectedMonthData =
    monthOptions.find((month) => month.key === selectedMonth) || monthOptions[0];
  const sourceRows = selectedMonthData.rows || [];
  const rows = useMemo(() => {
    if (selectedMonth !== "may") {
      return sourceRows;
    }

    return applyMayTimeFilter(sourceRows, selectedTimeFilter);
  }, [selectedMonth, selectedTimeFilter, sourceRows]);
  const headerRow = rows[0] || [];
  const bodyRows = useMemo(() => rows.slice(1), [rows]);

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-white px-3 py-4 md:px-6">
      <div className="shrink-0 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Daywise Distance</h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedMonth === "may" && (
            <select
              value={selectedTimeFilter}
              onChange={(event) =>
                setSelectedTimeFilter(event.target.value as TimeFilterOption)
              }
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-[#DB4848]"
            >
              {timeFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-md border border-gray-300 bg-white p-1">
            {monthOptions.map((month) => (
              <button
                key={month.key}
                type="button"
                onClick={() => setSelectedMonth(month.key)}
                className={[
                  "rounded px-4 py-2 text-sm font-medium transition",
                  selectedMonth === month.key
                    ? "bg-[#DB4848] text-white"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                {month.label}
              </button>
            ))}
          </div>
          {selectedMonthData.downloadHref ? (
            <a
              href={selectedMonthData.downloadHref}
              className="group relative inline-flex h-10 w-10 items-center justify-center rounded bg-[#DB4848] text-white hover:bg-[#c53f3f]"
              aria-label="Download Excel"
              title="Download Excel"
            >
              <Download className="h-5 w-5" />
              <span className="pointer-events-none absolute right-0 top-12 z-20 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                Download Excel
              </span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="group relative inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded bg-gray-300 text-gray-500"
              aria-label="Download Excel unavailable"
              title="No Excel available"
            >
              <Download className="h-5 w-5" />
              <span className="pointer-events-none absolute right-0 top-12 z-20 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                No Excel available
              </span>
            </button>
          )}
        </div>
      </div>

      {rows.length > 0 ? (
        <section className="min-h-0 flex-1 overflow-auto rounded border border-gray-300 bg-white">
          <table className="w-full table-fixed border-collapse text-[10px] text-gray-800">
            <thead>
              <tr>
                {headerRow.map((cell, index) => (
                  <th
                    key={`header-${index}`}
                    className={[
                      "sticky top-0 z-10 border border-gray-300 bg-gray-200 px-1 py-2 text-center font-bold",
                      index === 0 ? "w-[135px] text-left" : "",
                      index > 0 && index < 4 ? "w-[58px]" : "",
                      index >= 4 ? "w-[24px]" : "",
                    ].join(" ")}
                  >
                    {cell.value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="h-14">
                  {headerRow.map((_, columnIndex) => {
                    const cell = row[columnIndex] || { value: "" };
                    const isFirstColumn = columnIndex === 0;

                    return (
                      <td
                        key={`cell-${rowIndex}-${columnIndex}`}
                        className={[
                          "border border-gray-300 px-1 py-2 text-center align-middle",
                          isFirstColumn ? "w-[135px] text-left leading-tight" : "",
                          cell.isBlue
                            ? "bg-[#0000ff] text-[#0000ff]"
                            : cell.isOrange
                            ? "bg-[#ffcc99]"
                            : "bg-white",
                        ].join(" ")}
                      >
                        {cell.isBlue ? "" : cell.value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-gray-700">
            No {selectedMonthData.label} data added yet
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Add the {selectedMonthData.label} Excel data and connect it here to
            display this month.
          </p>
        </section>
      )}

    </main>
  );
}
