export type MorbiRouteDetailRow = {
  Town: string;
  Zone: string;
  Ward: string;
  "Route Name": string;
  "Route Type": string;
  Status: string;
  "Start Date": string;
  /** Daily Excel report date (filename day). May differ from Start Date for spillover rows. */
  "Report Date"?: string;
  /** Stable order within imported Excel files. */
  Seq?: number;
  Vehicle: string;
  "Start Time": string;
  "End Time": string;
  "Actual Start Time": string;
  "Actual End Time": string;
  "Planned POIs": number;
  "On-Time": number;
  Early: number;
  Delay: number;
  "Total Visited POIs": number;
  "Missed POIs": number;
};

/** Canonical day rows: belong to the report dated the same as Start Date. */
export function isMorbiCanonicalRow(row: MorbiRouteDetailRow) {
  const report = String(row["Report Date"] || "").trim();
  if (!report) return true;
  return report === String(row["Start Date"] || "").trim();
}

/** Parse DD-MM-YYYY into a local Date at midnight, or null if invalid. */
export function parseMorbiStartDate(dateStr: string): Date | null {
  const m = String(dateStr || "")
    .trim()
    .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function morbiDateKey(dateStr: string): string | null {
  const d = parseMorbiStartDate(dateStr);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM key from a Start Date string, or null. */
export function morbiMonthKey(dateStr: string): string | null {
  const d = parseMorbiStartDate(dateStr);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMorbiMonthLabel(monthKey: string): string {
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return monthKey;
  const year = m[1];
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${MONTH_LABELS[monthIdx]} ${year}`;
}

/** Unique months present in rows, newest first. */
export function listMorbiMonths(
  rows: MorbiRouteDetailRow[]
): { value: string; label: string }[] {
  const keys = new Set<string>();
  for (const row of rows) {
    const key = morbiMonthKey(row["Start Date"]);
    if (key) keys.add(key);
  }
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatMorbiMonthLabel(value) }));
}
