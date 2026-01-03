-- Create contract_templates table
create table if not exists public.contract_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  fields jsonb default '[]'::jsonb, -- Array of { id, label, placeholder, type, required }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contract_templates enable row level security;

-- Policies
create policy "Users can view their own templates" on public.contract_templates
  for select using (auth.uid() = user_id);

create policy "Users can insert their own templates" on public.contract_templates
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own templates" on public.contract_templates
  for update using (auth.uid() = user_id);

create policy "Users can delete their own templates" on public.contract_templates
  for delete using (auth.uid() = user_id);
