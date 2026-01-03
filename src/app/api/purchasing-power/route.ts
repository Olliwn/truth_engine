import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'purchasing_power.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading purchasing power data:', error);
    return NextResponse.json(
      { error: 'Failed to load purchasing power data' },
      { status: 500 }
    );
  }
}

