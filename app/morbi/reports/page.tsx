"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import { ChevronDown, ChevronRight, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import MorbiFiltersForm, {
  EMPTY_MORBI_FILTERS,
  MorbiFilterFormData,
} from "@/components/morbi/MorbiFiltersForm";
import { isMorbiUser } from "@/lib/authUsers";
import {
  formatMorbiMonthLabel,
  isMorbiCanonicalRow,
  listMorbiMonths,
  morbiDateKey,
  morbiMonthKey,
  parseMorbiStartDate,
  type MorbiRouteDetailRow,
} from "@/lib/morbiTypes";
import { exportMorbiRowsToXlsx } from "@/lib/exportMorbiXlsx";
import morbiRouteData from "@/data/morbi/routeDetailSummary.json";

interface AuthPayload {
  email: string;
}

const COLUMNS: { key: keyof MorbiRouteDetailRow; label: string }[] = [
  { key: "Town", label: "Town" },
  { key: "Zone", label: "Zone" },
  { key: "Ward", label: "Ward" },
  { key: "Route Name", label: "Route Name" },
  { key: "Route Type", label: "Route Type" },
  { key: "Status", label: "Status" },
  { key: "Start Date", label: "Start Date" },
  { key: "Vehicle", label: "Vehicle" },
  { key: "Start Time", label: "Start Time" },
  { key: "End Time", label: "End Time" },
  { key: "Actual Start Time", label: "Actual Start Time" },
  { key: "Actual End Time", label: "Actual End Time" },
  { key: "Planned POIs", label: "Planned POIs" },
  { key: "On-Time", label: "On-Time" },
  { key: "Early", label: "Early" },
  { key: "Delay", label: "Delay" },
  { key: "Total Visited POIs", label: "Total Visited POIs" },
  { key: "Missed POIs", label: "Missed POIs" },
];

const ALL_DATA = morbiRouteData as MorbiRouteDetailRow[];
const CANONICAL_DATA = ALL_DATA.filter((r) => isMorbiCanonicalRow(r));
const MONTH_OPTIONS = listMorbiMonths(CANONICAL_DATA);
/** Expand the earliest month by default (June before July). */
const DEFAULT_EXPANDED = (() => {
  const chronological = [...MONTH_OPTIONS].sort((a, b) =>
    a.value.localeCompare(b.value)
  );
  return chronological[0]?.value ? [chronological[0].value] : [];
})();

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Lowercase and strip spaces/hyphens so "route1" matches "Route-1". */
function normalizeSearch(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function filterMorbiRows(
  rows: MorbiRouteDetailRow[],
  appliedFormData: MorbiFilterFormData,
  routeSearch: string,
  vehicleSearch: string,
  appliedDateRange: DateRange | undefined,
  options?: { mode?: "canonical" | "report" }
) {
  const mode = options?.mode ?? "canonical";
  let filtered =
    mode === "report"
      ? [...rows]
      : rows.filter((r) => isMorbiCanonicalRow(r));

  if (appliedFormData.town.value !== "All") {
    filtered = filtered.filter((r) => r.Town === appliedFormData.town.value);
  }
  if (appliedFormData.zone.value !== "All") {
    filtered = filtered.filter((r) => r.Zone === appliedFormData.zone.value);
  }
  if (appliedFormData.ward.value !== "All") {
    filtered = filtered.filter((r) => r.Ward === appliedFormData.ward.value);
  }
  if (appliedFormData.routeName.value !== "All") {
    filtered = filtered.filter(
      (r) => r["Route Name"] === appliedFormData.routeName.value
    );
  }
  if (appliedFormData.status.value !== "All") {
    filtered = filtered.filter((r) => r.Status === appliedFormData.status.value);
  }

  const routeQ = normalizeSearch(routeSearch);
  if (routeQ) {
    filtered = filtered.filter((r) =>
      normalizeSearch(r["Route Name"]).includes(routeQ)
    );
  }

  const vehicleQ = normalizeSearch(vehicleSearch);
  if (vehicleQ) {
    filtered = filtered.filter((r) =>
      normalizeSearch(r.Vehicle).includes(vehicleQ)
    );
  }

  if (appliedDateRange?.from) {
    const from = startOfDay(appliedDateRange.from).getTime();
    const to = endOfDay(
      appliedDateRange.to ?? appliedDateRange.from
    ).getTime();

    filtered = filtered.filter((r) => {
      const dateStr =
        mode === "report"
          ? r["Report Date"] || r["Start Date"]
          : r["Start Date"];
      const parsed = parseMorbiStartDate(dateStr);
      if (!parsed) return false;
      const t = startOfDay(parsed).getTime();
      return t >= from && t <= to;
    });
  }

  return [...filtered].sort((a, b) => {
    const da =
      morbiDateKey(
        mode === "report"
          ? a["Report Date"] || a["Start Date"]
          : a["Start Date"]
      ) || "";
    const db =
      morbiDateKey(
        mode === "report"
          ? b["Report Date"] || b["Start Date"]
          : b["Start Date"]
      ) || "";
    if (da !== db) return da.localeCompare(db);
    const sa = Number(a.Seq);
    const sb = Number(b.Seq);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    return String(a["Route Name"] || "").localeCompare(
      String(b["Route Name"] || ""),
      undefined,
      { numeric: true }
    );
  });
}

function rowsForExport(
  rows: MorbiRouteDetailRow[],
  appliedFormData: MorbiFilterFormData,
  routeSearch: string,
  vehicleSearch: string,
  appliedDateRange: DateRange | undefined
) {
  // Export always uses report-day rows so each day sheet matches the source Excel.
  return filterMorbiRows(
    rows,
    appliedFormData,
    routeSearch,
    vehicleSearch,
    appliedDateRange,
    { mode: "report" }
  );
}

function groupRowsByMonth(rows: MorbiRouteDetailRow[]) {
  const groups = new Map<string, MorbiRouteDetailRow[]>();
  for (const row of rows) {
    const key = morbiMonthKey(row["Start Date"]);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, monthRows]) => ({
      monthKey,
      label: formatMorbiMonthLabel(monthKey),
      rows: monthRows,
    }));
}

export default function MorbiReportsPage() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [routeSearch, setRouteSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [expandedMonths, setExpandedMonths] =
    useState<string[]>(DEFAULT_EXPANDED);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRange | undefined
  >();
  const [appliedFormData, setAppliedFormData] =
    useState<MorbiFilterFormData>(EMPTY_MORBI_FILTERS);

  useEffect(() => {
    const token = Cookies.get("isAuthenticated");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      const decoded = jwt.verify(token, "SUPERSECRET") as AuthPayload;
      if (!isMorbiUser(decoded.email?.toLowerCase())) {
        router.push("/");
        return;
      }
      setIsAllowed(true);
    } catch {
      router.push("/");
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  const filteredData = filterMorbiRows(
    ALL_DATA,
    appliedFormData,
    routeSearch,
    vehicleSearch,
    appliedDateRange
  );
  const monthGroups = groupRowsByMonth(filteredData);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) =>
      prev.includes(monthKey)
        ? prev.filter((k) => k !== monthKey)
        : [...prev, monthKey]
    );
  };

  if (isChecking || !isAllowed) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="w-full px-1 py-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Route Detail Summary</h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Route Name"
                  className="w-48 rounded border px-2 py-1 pr-8"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                />
                <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Vehicle Number"
                  className="w-48 rounded border px-2 py-1 pr-8"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
                <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFilterOpen(true)}
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Toggle filters</span>
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
      </header>

      <main className="w-full px-1 py-4">
        <div className="mb-3 text-sm text-muted-foreground">
          Showing {filteredData.length} of {CANONICAL_DATA.length} day records
          {monthGroups.length
            ? ` · ${monthGroups.length} month${monthGroups.length === 1 ? "" : "s"}`
            : ""}
        </div>
        <div className="w-full overflow-auto rounded-md border">
          <table className="w-full min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-gray-100 text-gray-900">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold whitespace-nowrap">
                  #
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="border border-gray-300 px-3 py-2 text-left font-semibold whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No matching records
                  </td>
                </tr>
              ) : (
                monthGroups.map((group) => {
                  const isExpanded = expandedMonths.includes(group.monthKey);
                  return (
                    <FragmentMonth
                      key={group.monthKey}
                      group={group}
                      isExpanded={isExpanded}
                      onToggle={() => toggleMonth(group.monthKey)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <div
        className={`fixed top-0 right-0 z-40 h-full w-[min(100vw,42rem)] bg-white shadow-lg transition-transform duration-300 ease-in-out ${
          isFilterOpen
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!isFilterOpen}
      >
        <MorbiFiltersForm
          open={isFilterOpen}
          allData={ALL_DATA}
          appliedFormData={appliedFormData}
          appliedDateRange={appliedDateRange}
          resolveExportRows={(form, dates) =>
            rowsForExport(ALL_DATA, form, routeSearch, vehicleSearch, dates)
          }
          onApply={(nextForm, nextDates) => {
            setAppliedFormData(nextForm);
            setAppliedDateRange(nextDates);
          }}
          onExport={async (form, dates) => {
            const rows = rowsForExport(
              ALL_DATA,
              form,
              routeSearch,
              vehicleSearch,
              dates
            );
            await exportMorbiRowsToXlsx(rows);
          }}
          onClose={() => setIsFilterOpen(false)}
        />
      </div>

      {isFilterOpen ? (
        <button
          type="button"
          aria-label="Close filters overlay"
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setIsFilterOpen(false)}
        />
      ) : null}
    </div>
  );
}

function FragmentMonth({
  group,
  isExpanded,
  onToggle,
}: {
  group: {
    monthKey: string;
    label: string;
    rows: MorbiRouteDetailRow[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer bg-gray-100 hover:bg-gray-200/80"
        onClick={onToggle}
      >
        <td
          colSpan={COLUMNS.length + 1}
          className="border-b px-3 py-2.5 font-semibold text-gray-800"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <span>{group.label}</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({group.rows.length} records)
            </span>
          </div>
        </td>
      </tr>
      {isExpanded
        ? group.rows.map((row, idx) => (
            <tr
              key={`${group.monthKey}-${row["Start Date"]}-${row.Vehicle}-${row["Route Name"]}-${idx}`}
              className="odd:bg-white even:bg-gray-50/60"
            >
              <td className="border-b px-3 py-2 whitespace-nowrap">{idx + 1}</td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className="border-b px-3 py-2 whitespace-nowrap"
                >
                  {String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))
        : null}
    </>
  );
}
