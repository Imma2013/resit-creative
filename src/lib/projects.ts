import { getSupabaseServerClient } from '@/lib/supabase';

export async function listProjects() {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error('Supabase server credentials are not configured');
  const { data, error } = await supabase.from('projects').select('id,name,kind,created_at,updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProject(name: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error('Supabase server credentials are not configured');
  const { data, error } = await supabase.from('projects').insert({ name: name.trim() || 'Untitled project' }).select('id,name,kind,created_at,updated_at').single();
  if (error) throw error;
  return data;
}
