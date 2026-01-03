-- Add missing columns to invoices table
alter table invoices add column if not exists discount_percent numeric default 0;
alter table invoices add column if not exists discount_amount numeric default 0;
alter table invoices add column if not exists buyer_signature_url text;
alter table invoices add column if not exists is_recurring boolean default false;
alter table invoices add column if not exists recurring_interval text;
