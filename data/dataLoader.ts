// Zone data loader.
// Uses explicit JSON imports only (never import(`./${name}.json`) — that makes
 // webpack pull in corrupt backup files under data/ and break the build).
//
 // Do NOT fetch /api/data/* for these files in production: wastZone/eastZone are
 // 45–70MB and exceed serverless response limits, which leaves Job Summary empty.

let wastZoneCache: any[] | null = null;
let eastZoneCache: any[] | null = null;
let generalCache: any[] | null = null;
let brigrajsinhCache: any[] | null = null;

function ensureArray(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && "default" in data) {
    return Array.isArray(data.default) ? data.default : [];
  }
  return [];
}

async function importZoneJson(
  zone: "wastZone" | "eastZone" | "general" | "brigrajsinh"
): Promise<any[]> {
  switch (zone) {
    case "wastZone": {
      const mod = await import("./wastZone.json");
      return ensureArray(mod.default || mod);
    }
    case "eastZone": {
      const mod = await import("./eastZone.json");
      return ensureArray(mod.default || mod);
    }
    case "general": {
      const mod = await import("./general.json");
      return ensureArray(mod.default || mod);
    }
    case "brigrajsinh": {
      const mod = await import("./brigrajsinh.json");
      return ensureArray(mod.default || mod);
    }
  }
}

async function loadZone(
  zone: "wastZone" | "eastZone" | "general" | "brigrajsinh",
  getCache: () => any[] | null,
  setCache: (data: any[]) => void
): Promise<any[]> {
  const existing = getCache();
  if (existing) return existing;

  try {
    const data = await importZoneJson(zone);
    setCache(data);
    return data;
  } catch (error) {
    console.error(`Error loading ${zone} data:`, error);
    return [];
  }
}

export async function getWastZone(): Promise<any[]> {
  return loadZone(
    "wastZone",
    () => wastZoneCache,
    (d) => {
      wastZoneCache = d;
    }
  );
}

export async function getEastZone(): Promise<any[]> {
  return loadZone(
    "eastZone",
    () => eastZoneCache,
    (d) => {
      eastZoneCache = d;
    }
  );
}

export async function getGeneral(): Promise<any[]> {
  return loadZone(
    "general",
    () => generalCache,
    (d) => {
      generalCache = d;
    }
  );
}

export async function getBRIGRAJSINH(): Promise<any[]> {
  return loadZone(
    "brigrajsinh",
    () => brigrajsinhCache,
    (d) => {
      brigrajsinhCache = d;
    }
  );
}

/** Clear in-memory caches (e.g. after data updates in the same session). */
export function clearZoneDataCaches() {
  wastZoneCache = null;
  eastZoneCache = null;
  generalCache = null;
  brigrajsinhCache = null;
}

// For backward compatibility, export empty arrays initially
export const wastZone: any[] = [];
export const eastZone: any[] = [];
export const general: any[] = [];
export const BRIGRAJSINH: any[] = [];
