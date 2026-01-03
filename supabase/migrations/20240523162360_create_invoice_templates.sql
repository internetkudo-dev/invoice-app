-- Create invoice_templates table
create table if not exists invoice_templates (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    name text not null default 'Default Template',
    fields jsonb default '[]'::jsonb,
    show_logo boolean default true,
    show_signature boolean default true,
    show_notes boolean default true,
    show_discount boolean default true,
    show_tax boolean default true,
    default_due_days integer default 30,
    default_tax_rate numeric default 18,
    primary_color text default '#6366f1',
    footer_text text,
    is_default boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table invoice_templates enable row level security;

-- Create RLS policies
create policy "Users can view own templates"
    on invoice_templates for select
    using (auth.uid() = user_id);

create policy "Users can create own templates"
    on invoice_templates for insert
    with check (auth.uid() = user_id);

create policy "Users can update own templates"
    on invoice_templates for update
    using (auth.uid() = user_id);

create policy "Users can delete own templates"
    on invoice_templates for delete
    using (auth.uid() = user_id);
