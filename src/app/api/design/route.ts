import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import type { DesignElement } from '@/lib/types';

async function getOrCreateProject(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: existing, error: projectError } = await supabase
    .from('projects')
    .select('id,name,kind,created_at,updated_at')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (projectError) throw projectError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({ name: 'Resit Creative', kind: 'creative' })
    .select('id,name,kind,created_at,updated_at')
    .single();
  if (createError || !created) throw createError ?? new Error('Failed to create project');
  return created;
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });
    const project = await getOrCreateProject(supabase);
    const { data: document, error } = await supabase
      .from('design_documents')
      .select('id,project_id,width,height,elements,updated_at')
      .eq('project_id', project.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ project, document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load design' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });
    const body = await request.json();
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const elements = Array.isArray(body.elements) ? (body.elements as DesignElement[]) : [];
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('design_documents')
      .upsert({ project_id: projectId, width: Number(body.width ?? 1080), height: Number(body.height ?? 1350), elements }, { onConflict: 'project_id' })
      .select('id,project_id,width,height,elements,updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ document: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save design' }, { status: 500 });
  }
}
