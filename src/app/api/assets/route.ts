import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });
    const form = await request.formData(); const file = form.get('file'); const projectId = String(form.get('projectId') ?? '');
    if (!(file instanceof File) || !projectId) return NextResponse.json({ error: 'file and projectId are required' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image uploads are supported in Design.' }, { status: 415 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Images must be 10 MB or smaller.' }, { status: 413 });
    const { data: project, error: projectError } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (projectError) throw projectError; if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120) || 'image';
    const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('assets').upload(storagePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: asset, error: assetError } = await supabase.from('assets').insert({ project_id: projectId, type: 'image', name: file.name, storage_path: storagePath, metadata: { mimeType: file.type, size: file.size } }).select('id,project_id,type,name,storage_path,metadata,created_at').single();
    if (assetError) throw assetError;
    const { data: signed, error: signedError } = await supabase.storage.from('assets').createSignedUrl(storagePath, 86400);
    if (signedError) throw signedError;
    return NextResponse.json({ asset: { ...asset, url: signed.signedUrl } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to upload asset' }, { status: 500 }); }
}
