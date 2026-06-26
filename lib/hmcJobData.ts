export type HmcMonthKey = "march" | "april" | "may";

export type HmcDateOption = {
  iso: string;
  label: string;
};

export type HmcMonthIndex = Record<
  HmcMonthKey,
  {
    label: string;
    dates: HmcDateOption[];
  }
>;

export type HmcColumnDef = {
  key: string;
  label: string;
  group?: string;
};

export type HmcHeaderGroup = {
  label: string;
  colspan: number;
  rowSpan: number;
  children: HmcColumnDef[];
};

export type HmcJobSummary = {
  srNo: number;
  id: string;
  sheetName: string | null;
  _hmcIsoDate?: string;
  _hmcDateLabel?: string;
  [key: string]: string | number | null | undefined;
};

export type HmcSummaryData = {
  date: string;
  isoDate: string;
  month: HmcMonthKey;
  reportRange: string;
  headerGroups: HmcHeaderGroup[];
  columns: HmcColumnDef[];
  jobs: HmcJobSummary[];
};

export type HmcDetailData = {
  jobId: string;
  jobName: string;
  sheetName: string;
  date: string;
  isoDate: string;
  headerGroups: HmcHeaderGroup[];
  columns: HmcColumnDef[];
  rows: Record<string, string | number>[];
};

export const HMC_MONTHS: { key: HmcMonthKey; label: string }[] = [
  { key: "march", label: "March" },
  { key: "april", label: "April" },
  { key: "may", label: "May" },
];

export function getMonthCalendarBounds(month: HmcMonthKey, year = 2026) {
  const monthIndex = month === "march" ? 2 : month === "april" ? 3 : 4;

  return {
    from: new Date(year, monthIndex, 1),
    to: new Date(year, monthIndex + 1, 0),
  };
}

export function isDateInMonthTab(date: Date, month: HmcMonthKey, year = 2026) {
  const bounds = getMonthCalendarBounds(month, year);
  return date >= bounds.from && date <= bounds.to;
}

export async function fetchHmcIndex() {
  const response = await fetch("/data/hmc/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load HMC index");
  return (await response.json()) as HmcMonthIndex;
}

export function getRowCellValue(
  row: Record<string, string | number | null | undefined>,
  column: HmcColumnDef
) {
  if (row[column.key] !== undefined && row[column.key] !== null && row[column.key] !== "") {
    return row[column.key];
  }

  const slashKey = column.group
    ? `${column.group} / ${column.label}`
    : column.label;

  if (row[slashKey] !== undefined) {
    return row[slashKey];
  }

  return row[column.label];
}

export function formatCellValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "--";

  if (typeof value === "number" && value > 40000 && value < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!Number.isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, "0");
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const year = date.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  return String(value);
}

function toColumnDef(column: HmcColumnDef | string): HmcColumnDef {
  if (typeof column === "object" && column?.key) {
    return column;
  }

  const key = String(column);
  const label = key.includes("::")
    ? key.split("::").pop() || key
    : key.includes(" / ")
      ? key.split(" / ").pop() || key
      : key;

  return { key, label };
}

export function normalizeHmcTableStructure(data: {
  headerGroups?: HmcHeaderGroup[];
  columns?: Array<HmcColumnDef | string>;
}) {
  const rawColumns = data.columns || [];

  if (
    Array.isArray(data.headerGroups) &&
    data.headerGroups.length > 0 &&
    rawColumns.length > 0 &&
    typeof rawColumns[0] === "object"
  ) {
    return {
      headerGroups: data.headerGroups,
      columns: rawColumns as HmcColumnDef[],
    };
  }

  const columns = rawColumns.map(toColumnDef);
  const headerGroups: HmcHeaderGroup[] = columns.map((column) => ({
    label: column.label,
    colspan: 1,
    rowSpan: 2,
    children: [column],
  }));

  return { headerGroups, columns };
}

export async function fetchHmcSummary(month: HmcMonthKey, isoDate: string) {
  const response = await fetch(`/data/hmc/${month}/${isoDate}/summary.json`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load job summary");

  const data = (await response.json()) as HmcSummaryData;
  const { headerGroups, columns } = normalizeHmcTableStructure(data);

  return { ...data, headerGroups, columns };
}

export async function fetchHmcJobDetail(
  month: HmcMonthKey,
  isoDate: string,
  jobId: string
) {
  const safeId = jobId.replace(/[<>:"/\\|?*]/g, "_");
  const response = await fetch(
    `/data/hmc/${month}/${isoDate}/details/${encodeURIComponent(safeId)}.json`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("Failed to load job detail");

  const data = (await response.json()) as HmcDetailData;
  const { headerGroups, columns } = normalizeHmcTableStructure(data);

  return { ...data, headerGroups, columns };
}

export function isoToDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateToIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getIsoDatesInRange(
  availableDates: HmcDateOption[],
  from?: Date,
  to?: Date
) {
  if (!from) return [];

  const end = to || from;
  const startIso = dateToIso(from);
  const endIso = dateToIso(end);
  const [rangeStart, rangeEnd] =
    startIso <= endIso ? [startIso, endIso] : [endIso, startIso];

  return availableDates
    .filter((item) => item.iso >= rangeStart && item.iso <= rangeEnd)
    .map((item) => item.iso);
}

export function combineHmcSummaries(summaries: HmcSummaryData[]) {
  if (!summaries.length) {
    throw new Error("No summaries to combine");
  }

  const first = summaries[0];
  const jobs: HmcJobSummary[] = [];
  let srNo = 0;

  for (const summary of summaries) {
    for (const job of summary.jobs) {
      srNo += 1;
      jobs.push({
        ...job,
        srNo,
        _hmcIsoDate: summary.isoDate,
        _hmcDateLabel: summary.date,
        "Start Date": job["Start Date"] || summary.date,
      });
    }
  }

  const fromLabel = summaries[0].date;
  const toLabel = summaries[summaries.length - 1].date;

  return {
    ...first,
    reportRange:
      fromLabel === toLabel
        ? `${fromLabel} 12:00 AM to ${fromLabel} 11:59 PM`
        : `${fromLabel} to ${toLabel} (${summaries.length} days)`,
    jobs,
  };
}

export async function fetchHmcCombinedSummary(
  month: HmcMonthKey,
  isoDates: string[]
) {
  if (!isoDates.length) {
    throw new Error("No dates selected");
  }

  const summaries = await Promise.all(
    isoDates.map((isoDate) => fetchHmcSummary(month, isoDate))
  );

  return combineHmcSummaries(summaries);
}
