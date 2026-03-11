import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { zone: string } }
) {
  try {
    const { zone } = params;
    
    // Validate zone name
    const validZones = ['wastZone', 'eastZone', 'general', 'brigrajsinh'];
    if (!validZones.includes(zone)) {
      return NextResponse.json(
        { error: 'Invalid zone name' },
        { status: 400 }
      );
    }
    
    // Read the JSON file from data directory
    const filePath = path.join(process.cwd(), 'data', `${zone}.json`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Zone data not found' },
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Return with caching headers for better performance
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`Error loading zone data for ${params.zone}:`, error);
    return NextResponse.json(
      { error: 'Failed to load zone data' },
      { status: 500 }
    );
  }
}
