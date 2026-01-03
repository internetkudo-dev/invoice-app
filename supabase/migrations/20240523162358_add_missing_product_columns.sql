-- Add missing columns to products table
alter table products add column if not exists unit text;
alter table products add column if not exists category text;
alter table products add column if not exists stock_quantity integer default 0;
alter table products add column if not exists track_stock boolean default false;
alter table products add column if not exists low_stock_threshold integer default 10;
alter table products add column if not exists barcode text;
alter table products add column if not exists description text;
