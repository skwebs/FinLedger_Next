-- FinLedger: Person Relationship Type
-- Run once in Supabase SQL Editor
-- Adds relationship_type column to accounts table

alter table accounts
  add column if not exists relationship_type text default 'lend_borrow';

-- Valid values: lend_borrow | pay_to | receive_from | general
-- Null means non-person account (bank, credit_card, etc.)
