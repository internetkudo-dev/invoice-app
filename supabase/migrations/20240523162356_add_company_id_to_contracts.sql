alter table contracts add column if not exists company_id uuid references auth.users(id);
