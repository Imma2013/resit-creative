-- Resit Creative storage foundation
-- Asset bytes live in Supabase Storage; metadata remains in public.assets.
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;
