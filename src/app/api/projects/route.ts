import { NextResponse } from 'next/server';
import { createProject, listProjects } from '@/lib/projects';

export async function GET() {
  try {
    return NextResponse.json({ projects: await listProjects() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = await createProject(typeof body?.name === 'string' ? body.name : 'Untitled project');
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create project' }, { status: 500 });
  }
}
