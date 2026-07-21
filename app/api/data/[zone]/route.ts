import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zone: string }> }
) {
  let zone = '';
  try {
    ({ zone } = await params);

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

    // no-store so newly added jobs appear in filters without waiting for CDN/browser cache
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`Error loading zone data for ${zone || 'unknown'}:`, error);
    return NextResponse.json(
      { error: 'Failed to load zone data' },
      { status: 500 }
    );
  }
}
