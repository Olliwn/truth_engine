import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'ponzi_index.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const ponziData = JSON.parse(data);
    
    return NextResponse.json(ponziData);
  } catch (error) {
    console.error('Failed to load ponzi data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}

