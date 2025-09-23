// Dynamic data loader to avoid memory issues during build
let wastZoneCache: any[] | null = null;
let eastZoneCache: any[] | null = null;
let generalCache: any[] | null = null;
let brigrajsinhCache: any[] | null = null;

export async function getWastZone(): Promise<any[]> {
  if (wastZoneCache) return wastZoneCache;
  
  try {
    const wastZoneData = await import('./wastZone.json');
    wastZoneCache = wastZoneData.default || wastZoneData;
    return wastZoneCache;
  } catch (error) {
    console.error('Error loading wastZone data:', error);
    return [];
  }
}

export async function getEastZone(): Promise<any[]> {
  if (eastZoneCache) return eastZoneCache;
  
  try {
    const eastZoneData = await import('./eastZone.json');
    eastZoneCache = eastZoneData.default || eastZoneData;
    return eastZoneCache;
  } catch (error) {
    console.error('Error loading eastZone data:', error);
    return [];
  }
}

export async function getGeneral(): Promise<any[]> {
  if (generalCache) return generalCache;
  
  try {
    const generalData = await import('./general.json');
    generalCache = generalData.default || generalData;
    return generalCache;
  } catch (error) {
    console.error('Error loading general data:', error);
    return [];
  }
}

export async function getBRIGRAJSINH(): Promise<any[]> {
  if (brigrajsinhCache) return brigrajsinhCache;
  
  try {
    const brigrajsinhData = await import('./brigrajsinh.json');
    brigrajsinhCache = brigrajsinhData.default || brigrajsinhData;
    console.log('BRIGRAJSINH data loaded from file:', brigrajsinhCache.length, 'items');
    console.log('BRIGRAJSINH sample data from file:', brigrajsinhCache.slice(0, 2));
    return brigrajsinhCache;
  } catch (error) {
    console.error('Error loading BRIGRAJSINH data:', error);
    return [];
  }
}

// For backward compatibility, export empty arrays initially
export const wastZone: any[] = [];
export const eastZone: any[] = [];
export const general: any[] = [];
export const BRIGRAJSINH: any[] = [];