export const HIDDEN_MONTH_PREFIX = "2026-03";

type AnyRecord = Record<string, any>;

function toDateKey(value: unknown): string | null {
  if (typeof value === "string") {
    // handles "YYYY-MM-DD" and "YYYY-MM-DD HH:mm:ss"
    return value.trim().slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function isHiddenMarch2026Date(value: unknown): boolean {
  const key = toDateKey(value);
  return typeof key === "string" && key.startsWith(HIDDEN_MONTH_PREFIX);
}

export function hideMarch2026FromJobs<T extends AnyRecord>(jobs: T[]): T[] {
  return jobs
    .map((job) => {
      const details = (job as any).more_details;
      if (!Array.isArray(details)) return job;

      const nextDetails = details.filter((d: any) => !isHiddenMarch2026Date(d?.Date));
      if (nextDetails.length === details.length) return job;
      if (nextDetails.length === 0) return null;

      return { ...(job as any), more_details: nextDetails };
    })
    .filter(Boolean) as T[];
}

