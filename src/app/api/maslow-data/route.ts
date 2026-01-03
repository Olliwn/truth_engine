import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'maslow_cpi.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const maslowData = JSON.parse(data);

    return NextResponse.json(maslowData);
  } catch (error) {
    console.error('Failed to load maslow data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}

