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

export function formatHmcDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatHmcDateRangeSummary(from?: Date, to?: Date) {
  if (!from) {
    return "Select a date or date range";
  }

  const fromLabel = formatHmcDisplayDate(from);
  const toDate = to || from;
  const toLabel = formatHmcDisplayDate(toDate);

  return `${fromLabel} 12:00 AM to ${toLabel} 11:59 PM`;
}

export function formatHmcDateRangeLabel(from?: Date, to?: Date) {
  if (!from) {
    return "Select dates";
  }

  const fromLabel = formatHmcDisplayDate(from);
  const toDate = to || from;
  const toLabel = formatHmcDisplayDate(toDate);

  if (fromLabel === toLabel) {
    return fromLabel;
  }

  return `${fromLabel} - ${toLabel}`;
}

export type HmcSummaryFilterState = {
  dateRange?: { from: Date; to: Date };
  jobIds: string[] | null;
  filtersApplied: boolean;
};

export function buildHmcSummaryFilterSearchParams(
  dateRange: { from: Date; to?: Date },
  jobIds: string[] | null
) {
  const params = new URLSearchParams();
  params.set("from", dateToIso(dateRange.from));
  params.set("to", dateToIso(dateRange.to || dateRange.from));

  if (jobIds?.length) {
    params.set("jobs", jobIds.join(","));
  }

  return params;
}

export function parseHmcSummaryFiltersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): HmcSummaryFilterState {
  const from = searchParams.get("from");

  if (!from) {
    return { dateRange: undefined, jobIds: null, filtersApplied: false };
  }

  const to = searchParams.get("to") || from;
  const jobs = searchParams.get("jobs");

  return {
    dateRange: {
      from: isoToDate(from),
      to: isoToDate(to),
    },
    jobIds: jobs ? jobs.split(",").filter(Boolean) : null,
    filtersApplied: true,
  };
}

export function buildHmcSummaryPageHref(filters?: {
  dateRange?: { from: Date; to?: Date };
  jobIds: string[] | null;
}) {
  if (!filters?.dateRange?.from) {
    return "/jobdetails";
  }

  const params = buildHmcSummaryFilterSearchParams(
    filters.dateRange,
    filters.jobIds
  );

  return `/jobdetails?${params.toString()}`;
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

export const HMC_ZONE_COLUMN_KEY = "Zone";

export const HMC_NAGAR_NIGAM_ZONE = "Hisar Nagar Nigam";

export function getHmcJobZone(
  job: Record<string, string | number | null | undefined>
) {
  const value = job[HMC_ZONE_COLUMN_KEY];
  return value !== null && value !== undefined ? String(value).trim() : "";
}

export function isHmcNagarNigamJob(
  job: Record<string, string | number | null | undefined>
) {
  return (
    getHmcJobZone(job).toLowerCase() === HMC_NAGAR_NIGAM_ZONE.toLowerCase()
  );
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
      if (!isHmcNagarNigamJob(job)) continue;

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

  const reportRange = formatHmcDateRangeSummary(
    isoToDate(summaries[0].isoDate),
    isoToDate(summaries[summaries.length - 1].isoDate)
  );

  return {
    ...first,
    reportRange,
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

export function getAllAvailableHmcDates(index: HmcMonthIndex) {
  const dates: HmcDateOption[] = [];

  for (const month of HMC_MONTHS) {
    dates.push(...(index[month.key]?.dates || []));
  }

  return dates.sort((a, b) => a.iso.localeCompare(b.iso));
}

export function getHmcMonthForIso(
  iso: string,
  index: HmcMonthIndex
): HmcMonthKey | null {
  for (const month of HMC_MONTHS) {
    const dates = index[month.key]?.dates || [];
    if (dates.some((item) => item.iso === iso)) {
      return month.key;
    }
  }

  return null;
}

export async function fetchHmcCombinedSummaryForDates(
  index: HmcMonthIndex,
  isoDates: string[]
) {
  if (!isoDates.length) {
    throw new Error("No dates selected");
  }

  const datesByMonth = new Map<HmcMonthKey, string[]>();

  for (const iso of isoDates) {
    const month = getHmcMonthForIso(iso, index);
    if (!month) continue;

    const monthDates = datesByMonth.get(month) || [];
    monthDates.push(iso);
    datesByMonth.set(month, monthDates);
  }

  const monthSummaries = await Promise.all(
    [...datesByMonth.entries()].map(([month, dates]) =>
      fetchHmcCombinedSummary(month, dates)
    )
  );

  monthSummaries.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  return combineHmcSummaries(monthSummaries);
}

export function buildFullMonthDateRange(availableDates: HmcDateOption[]) {
  if (!availableDates.length) return undefined;

  return {
    from: isoToDate(availableDates[0].iso),
    to: isoToDate(availableDates[availableDates.length - 1].iso),
  };
}

export function buildFirstDayDateRange(availableDates: HmcDateOption[]) {
  if (!availableDates.length) return undefined;

  const firstDay = isoToDate(availableDates[0].iso);

  return {
    from: firstDay,
    to: firstDay,
  };
}

export const HMC_SUMMARY_TOTAL_METRICS = [
  {
    key: "Planned Checkpoints",
    label: "Planned Checkpoints",
    className: "text-[#6b21a8]",
  },
  {
    key: "Total Visited Checkpoints",
    label: "Visited Checkpoints",
    className: "text-[#15803d]",
  },
  {
    key: "Missed Checkpoints",
    label: "Missed Checkpoints",
    className: "text-[#ea580c]",
  },
  {
    key: "Checkpoints Complete Status(%)",
    label: "Checkpoints Complete Status(%)",
    className: "text-gray-900",
  },
  {
    key: "Estimated Distance",
    label: "Estimated Distance",
    className: "text-gray-900",
  },
] as const;

export function parseHmcNumericValue(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value).replace(/,/g, "").trim();
  if (!cleaned || cleaned === "--") return 0;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatHmcTotalValue(value: number) {
  return Number.isInteger(value) ? `${value}.0` : value.toFixed(1);
}

export function formatHmcSummaryTotalValue(key: string, value: number) {
  if (key === "Checkpoints Complete Status(%)") {
    return String(Math.round(value));
  }

  return formatHmcTotalValue(value);
}

export function computeHmcSummaryTotals(
  rows: Record<string, string | number | null | undefined>[],
  columns?: HmcColumnDef[]
) {
  const totals: Record<string, number> = {};

  for (const metric of HMC_SUMMARY_TOTAL_METRICS) {
    totals[metric.key] = 0;
  }

  const columnDefs =
    columns ||
    HMC_SUMMARY_TOTAL_METRICS.map((metric) => ({
      key: metric.key,
      label: metric.label,
    }));

  for (const row of rows) {
    for (const column of columnDefs) {
      if (!(column.key in totals)) continue;
      if (column.key === "Checkpoints Complete Status(%)") continue;

      totals[column.key] += parseHmcNumericValue(
        getRowCellValue(row, column)
      );
    }
  }

  const planned = totals["Planned Checkpoints"];
  const visited = totals["Total Visited Checkpoints"];
  totals["Checkpoints Complete Status(%)"] =
    planned > 0 ? Math.round((visited / planned) * 100) : 0;

  return totals;
}

export const HMC_WARD_COLUMN_KEY = "Ward";

export function getHmcJobWard(
  job: Record<string, string | number | null | undefined>
) {
  const value = job[HMC_WARD_COLUMN_KEY];
  return value !== null && value !== undefined ? String(value).trim() : "";
}

export function normalizeHmcWardKey(ward: string) {
  return ward.trim().toLowerCase();
}

export function getUniqueHmcWards(
  jobs: Record<string, string | number | null | undefined>[]
) {
  const wardMap = new Map<string, string>();

  for (const job of jobs) {
    const ward = getHmcJobWard(job);
    if (!ward) continue;

    const key = normalizeHmcWardKey(ward);
    if (!wardMap.has(key)) {
      wardMap.set(key, ward);
    }
  }

  return [...wardMap.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    );
}

export function filterHmcJobsByWards<T extends Record<string, string | number | null | undefined>>(
  jobs: T[],
  selectedWards: string[] | null
) {
  if (!selectedWards) return jobs;

  const selected = new Set(selectedWards.map(normalizeHmcWardKey));

  return jobs.filter((job) => {
    const ward = getHmcJobWard(job);
    return ward && selected.has(normalizeHmcWardKey(ward));
  });
}

export const HMC_JOB_NAME_COLUMN_KEY = "Job Name";

export function getHmcJobId(
  job: Record<string, string | number | null | undefined>
) {
  return job.id !== null && job.id !== undefined ? String(job.id).trim() : "";
}

export function getHmcJobName(
  job: Record<string, string | number | null | undefined>
) {
  const name = job[HMC_JOB_NAME_COLUMN_KEY];
  if (name !== null && name !== undefined && String(name).trim()) {
    return String(name).trim();
  }

  return getHmcJobId(job);
}

export type HmcWardJobOption = {
  key: string;
  label: string;
};

export type HmcWardJobGroup = {
  key: string;
  label: string;
  jobs: HmcWardJobOption[];
};

export function buildHmcWardJobGroups(
  jobs: Record<string, string | number | null | undefined>[]
): HmcWardJobGroup[] {
  const wardGroups = new Map<
    string,
    { label: string; jobs: Map<string, string> }
  >();

  for (const job of jobs) {
    const ward = getHmcJobWard(job);
    const jobId = getHmcJobId(job);
    if (!ward || !jobId) continue;

    const wardKey = normalizeHmcWardKey(ward);
    if (!wardGroups.has(wardKey)) {
      wardGroups.set(wardKey, { label: ward, jobs: new Map() });
    }

    const group = wardGroups.get(wardKey)!;
    if (!group.jobs.has(jobId)) {
      group.jobs.set(jobId, getHmcJobName(job));
    }
  }

  return [...wardGroups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      jobs: [...group.jobs.entries()]
        .map(([jobKey, label]) => ({ key: jobKey, label }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { numeric: true })
        ),
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    );
}

export function getAllHmcJobFilterKeys(groups: HmcWardJobGroup[]) {
  return groups.flatMap((group) => group.jobs.map((job) => job.key));
}

export function filterHmcJobsByJobIds<
  T extends Record<string, string | number | null | undefined>,
>(jobs: T[], selectedJobIds: string[] | null) {
  if (!selectedJobIds) return jobs;

  const selected = new Set(selectedJobIds);

  return jobs.filter((job) => {
    const jobId = getHmcJobId(job);
    return jobId && selected.has(jobId);
  });
}
