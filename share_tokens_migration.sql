-- FinLedger: Share Statement Feature
-- Run once in Supabase SQL Editor
-- No SUPABASE_SERVICE_ROLE_KEY needed after this

-- 1. Share tokens table
create table if not exists share_tokens (
  id         uuid default gen_random_uuid() primary key,
  token      uuid default gen_random_uuid() unique not null,
  account_id uuid references accounts(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  label      text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table share_tokens enable row level security;

-- Owner manages their own tokens
create policy "own_share_tokens" on share_tokens
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public can read token rows (to validate a token)
create policy "public_read_share_token" on share_tokens
  for select using (true);


-- 2. SECURITY DEFINER function
--    Runs as the DB owner — bypasses RLS on accounts/transactions
--    Only returns data for the one account tied to the token
--    This replaces the need for SUPABASE_SERVICE_ROLE_KEY

create or replace function public.get_shared_statement(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_expires_at timestamptz;
  v_label      text;
  v_account    json;
  v_txns       json;
begin
  -- Validate token
  select account_id, expires_at, label
    into v_account_id, v_expires_at, v_label
    from share_tokens
   where token = p_token;

  if not found then
    return json_build_object('error', 'Invalid or expired link');
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    return json_build_object('error', 'This link has expired');
  end if;

  -- Fetch account
  select row_to_json(a) into v_account
    from (
      select id, name, type, balance, currency,
             billing_day, credit_limit, color
        from accounts
       where id = v_account_id
    ) a;

  if v_account is null then
    return json_build_object('error', 'Account not found');
  end if;

  -- Fetch transactions
  select json_agg(t order by t.txn_at desc) into v_txns
    from (
      select id, amount, type, category, description,
             txn_at, to_account_id
        from transactions
       where account_id = v_account_id
    ) t;

  return json_build_object(
    'account',      v_account,
    'transactions', coalesce(v_txns, '[]'::json),
    'label',        v_label,
    'generated',    now()
  );
end;
$$;

-- Allow unauthenticated users to call this function
grant execute on function public.get_shared_statement(uuid) to anon, authenticated;
