-- Create contracts table
create table if not exists public.contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  status text default 'draft', -- draft, signed, active, terminated
  type text not null, -- service_agreement, nda, etc.
  content jsonb default '{}'::jsonb, -- Stores the answers/variables
  html_body text, -- Stores the generated HTML content if we want to cache it or edit it
  signature_url text, -- For the user's signature
  counterparty_signature_url text, -- For the client's signature
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contracts enable row level security;

-- Policies
create policy "Users can view their own contracts" on public.contracts
  for select using (auth.uid() = user_id);

create policy "Users can insert their own contracts" on public.contracts
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own contracts" on public.contracts
  for update using (auth.uid() = user_id);

create policy "Users can delete their own contracts" on public.contracts
  for delete using (auth.uid() = user_id);
