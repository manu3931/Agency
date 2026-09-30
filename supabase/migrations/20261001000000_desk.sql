-- The database behind the live site.
--
-- Paste this whole file into the Supabase SQL editor and run it once (or `supabase db push`).
-- Running it again is safe: every statement replaces or skips what is already there.
--
-- One table, public.docs, keeps everything the desk stores: jobs, settings, the gear fund,
-- payments, clients, photos and the team list. Each row is a document at a two-part path such
-- as "bookings/b123", the same shape the claude.ai version uses. Row-level security decides who
-- sees what:
--   * anyone, signed in or not: settings/company, catalog/public and photos (the storefront)
--   * a signed-in client: their own jobs, payments and client record, nothing else
--   * the team (an email listed at team/<email>, once that email is confirmed): everything
-- Clients never write rows themselves. They call the client_* functions at the bottom, which
-- check what they send and only ever touch that client's own records.
--
-- Nothing private lives in this file. Team emails are added afterwards; see SETUP.md.

-- ---------------------------------------------------------------- helpers

create or replace function public._num(v text, d numeric default 0) returns numeric
language sql immutable set search_path = '' as $$
  select case when v ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then v::numeric else d end;
$$;

create or replace function public._date(v text) returns date
language plpgsql immutable set search_path = '' as $$
begin
  if v is null or v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  return v::date;
exception when others then return null;
end $$;

create or replace function public._newid(prefix text) returns text
language sql volatile set search_path = '' as $$
  select prefix || to_char(clock_timestamp(), 'YYMMDDHH24MISS') || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
$$;

-- ---------------------------------------------------------------- the table

create table if not exists public.docs (
  path text primary key check (path ~ '^[A-Za-z0-9_-]{1,40}/[A-Za-z0-9_.@+-]{1,120}$'),
  coll text not null default '',
  id text not null default '',
  data jsonb not null default '{}'::jsonb,
  owner uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists docs_coll on public.docs (coll);
create index if not exists docs_owner on public.docs (owner) where owner is not null;

-- Keeps coll and id in step with the path, and links a job to the client's account when the
-- email on the job belongs to someone who has signed up and confirmed that email.
create or replace function public.docs_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare linked uuid;
begin
  new.coll := split_part(new.path, '/', 1);
  new.id := split_part(new.path, '/', 2);
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.owner := coalesce(new.owner, old.owner);
  end if;
  if new.coll = 'team' and new.id <> lower(new.id) then
    raise exception 'Team emails are stored in lower case.';
  end if;
  if new.coll = 'bookings' and coalesce(new.data->>'source', '') <> 'storefront' then
    select u.id into linked from auth.users u
      where lower(u.email) = lower(nullif(trim(new.data #>> '{client,email}'), '')) and u.email_confirmed_at is not null
      limit 1;
    new.owner := linked;
  end if;
  -- A payment the team records belongs to whoever the job belongs to, so the client sees it too.
  if new.coll = 'payments' and new.owner is null and coalesce(new.data->>'bookingId', '') <> '' then
    select d.owner into new.owner from public.docs d where d.path = 'bookings/' || (new.data->>'bookingId');
  end if;
  return new;
end $$;
drop trigger if exists docs_before on public.docs;
create trigger docs_before before insert or update on public.docs for each row execute function public.docs_before();

create or replace function public.docs_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.coll = 'team' and (select count(*) from public.docs where coll = 'team') <= 1 then
    raise exception 'Keep at least one person on the team.';
  end if;
  return old;
end $$;
drop trigger if exists docs_guard on public.docs;
create trigger docs_guard before delete on public.docs for each row execute function public.docs_guard();

-- ---------------------------------------------------------------- who is on the team

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join public.docs t on t.coll = 'team' and t.id = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

-- ---------------------------------------------------------------- row-level security

alter table public.docs enable row level security;

drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select using (
  (coll = 'settings' and id = 'company')
  or (coll = 'catalog' and id = 'public')
  or coll = 'photos'
  or (owner = (select auth.uid()) and coll in ('bookings', 'payments', 'clients'))
  or (select public.is_admin())
);
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert with check ((select public.is_admin()));
drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete using ((select public.is_admin()));

revoke all on public.docs from anon, authenticated;
grant select on public.docs to anon, authenticated;
grant insert, update, delete on public.docs to authenticated;

-- ---------------------------------------------------------------- what clients may do

-- A storefront request. Only whitelisted fields are kept; prices are left for the team to quote.
create or replace function public.submit_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  em text; s jsonb; waiting int;
  d_pick date; d_ret date; d_shoot date; sd int; poss int;
  lns jsonb; crw jsonb; bid text; ref text; prefix text;
  h_out text; h_back text; prot text; t_pick text; t_ret text;
begin
  if uid is null then raise exception 'Sign in to send a request.' using errcode = '42501'; end if;
  select u.email into em from auth.users u where u.id = uid;
  select count(*) into waiting from public.docs where coll = 'bookings' and owner = uid and data->>'status' = 'request';
  if waiting >= 5 then raise exception 'You already have 5 requests waiting for a quote. We will be in touch soon.'; end if;
  select coalesce((select data from public.docs where path = 'settings/company'), '{}'::jsonb) into s;

  d_pick := public._date(p->>'pickup'); d_ret := public._date(p->>'returnDate');
  if d_pick is null or d_ret is null or d_ret < d_pick or d_pick < current_date - 1 or d_ret > current_date + 730 then
    raise exception 'Pick a pickup date from today on, and a return date on or after it.';
  end if;
  sd := least(greatest(round(public._num(p->>'shootDays', 1))::int, 0), 60);
  poss := least(greatest(round(public._num(p->>'possessionDays', 0))::int, 0), 60);
  d_shoot := coalesce(public._date(p->>'shootStart'), d_pick);
  if d_shoot < d_pick or d_shoot > d_ret then d_shoot := d_pick; end if;
  t_pick := case when p->>'pickupTime' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p->>'pickupTime' else '15:00' end;
  t_ret := case when p->>'returnTime' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then p->>'returnTime' else '10:00' end;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into lns from (
    select jsonb_build_object(
      'id', l->>'id',
      'qty', least(greatest(round(public._num(l->>'qty', 1))::int, 1), 50),
      'days', least(greatest(public._num(l->>'days', sd), 0), 365),
      'tier', case when l->>'tier' in ('A', 'B', 'C') then l->>'tier' else 'C' end,
      'comp', false, 'rate', null,
      'pkg', case when l->>'pkg' ~ '^PKG-[A-Z0-9-]{1,40}$' then l->>'pkg' end) as x
    from jsonb_array_elements(case when jsonb_typeof(p->'lines') = 'array' then p->'lines' else '[]'::jsonb end) l
    where l->>'id' ~ '^[A-Z?]-[A-Z]{3}-[0-9]{1,4}$'
    limit 150) q;
  if jsonb_array_length(lns) = 0 then raise exception 'Add at least one piece of gear.'; end if;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into crw from (
    select jsonb_build_object(
      'role', left(c->>'role', 80),
      'rate', least(greatest(public._num(c->>'rate', 0), 0), 10000),
      'people', least(greatest(round(public._num(c->>'people', 1))::int, 1), 10),
      'days', least(greatest(public._num(c->>'days', sd), 0), 365),
      'tier', case when c->>'tier' in ('A', 'B', 'C') then c->>'tier' else 'C' end) as x
    from jsonb_array_elements(case when jsonb_typeof(p->'crew') = 'array' then p->'crew' else '[]'::jsonb end) c
    where coalesce(c->>'role', '') <> ''
    limit 10) q;

  h_out := case when p #>> '{handoff,out}' in ('pickup', 'delivery', 'afterhours') then p #>> '{handoff,out}' else 'pickup' end;
  h_back := case when p #>> '{handoff,back}' in ('pickup', 'delivery', 'afterhours') then p #>> '{handoff,back}' else h_out end;
  prot := case when p->>'protection' in ('coi', 'hold', 'waiver') then p->>'protection' else 'coi' end;
  select coalesce(string_agg(upper(left(w, 1)), ''), 'R') into prefix from (
    select w from regexp_split_to_table(coalesce(nullif(s->>'company', ''), 'Rental'), '[^A-Za-z0-9]+') w where w <> '' limit 3) q;
  bid := public._newid('b');
  ref := prefix || '-' || to_char(now() at time zone 'America/New_York', 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 3));

  insert into public.docs (path, data, owner) values ('bookings/' || bid, jsonb_build_object(
    'id', bid, 'ref', ref, 'status', 'request', 'source', 'storefront',
    'project', left(coalesce(p->>'project', ''), 120),
    'client', jsonb_build_object(
      'name', left(coalesce(p #>> '{client,name}', ''), 120), 'company', left(coalesce(p #>> '{client,company}', ''), 120),
      'email', em, 'phone', left(coalesce(p #>> '{client,phone}', ''), 40)),
    'pickup', d_pick::text, 'pickupTime', t_pick, 'shootStart', d_shoot::text, 'shootDays', sd, 'possessionDays', poss,
    'returnDate', d_ret::text, 'returnTime', t_ret, 'prepDate', '',
    'rateMode', case when s->>'rateMode' = 'week' then 'week' else 'straight' end,
    'favor', false, 'budget', 'A', 'expendables', 0, 'lines', lns, 'crew', crw,
    'notes', left(coalesce(p->>'notes', ''), 2000),
    'handoff', jsonb_build_object('out', h_out, 'back', h_back, 'address', left(coalesce(p #>> '{handoff,address}', ''), 300)),
    'protection', prot,
    'discount', case when p #>> '{discount,kind}' = 'student' and public._num(s->>'studentPct', 15) > 0
      then jsonb_build_object('kind', 'student', 'pct', public._num(s->>'studentPct', 15)) else '{"kind":"none","pct":0}'::jsonb end,
    'tax', jsonb_build_object('exempt', p #>> '{tax,exempt}' = 'true', 'cert', false),
    'coi', '{"status":"none"}'::jsonb, 'hold', '{"placed":false}'::jsonb, 'waiver', '{"accepted":false}'::jsonb,
    'contract', '{"status":"draft"}'::jsonb, 'deposit', '{"status":"none"}'::jsonb,
    'checkout', '{"out":{},"back":{},"notes":{}}'::jsonb,
    'createdAt', to_jsonb(now()), 'createdBy', uid::text), uid);
  return jsonb_build_object('id', bid, 'ref', ref);
end $$;

-- Sign the agreement the team sent. The hash proves the client signed exactly the text on file.
create or replace function public.client_sign(p_id text, p_name text, p_signature text, p_hash text, p_consent boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record; c jsonb; hdr json;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into r from public.docs where path = 'bookings/' || p_id and owner = uid for update;
  if not found then raise exception 'That booking was not found.'; end if;
  c := coalesce(r.data->'contract', '{}'::jsonb);
  if coalesce(c->>'status', '') <> 'sent' or coalesce(c->>'text', '') = '' then raise exception 'This agreement is not ready to sign yet.'; end if;
  if p_hash is distinct from encode(sha256(convert_to(c->>'text', 'UTF8')), 'hex') then
    raise exception 'The agreement changed since you opened it. Reload the page to read the latest version.';
  end if;
  if not coalesce(p_consent, false) then raise exception 'Tick the box to agree to sign electronically.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(p_name) > 120 then raise exception 'Type your full name.'; end if;
  if p_signature is null or p_signature !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or length(p_signature) > 300000 then
    raise exception 'Draw your signature in the box.';
  end if;
  hdr := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  c := c || jsonb_build_object(
    'status', 'signed', 'signer', trim(p_name), 'signedOn', to_char(now() at time zone 'America/New_York', 'YYYY-MM-DD'),
    'signedAt', now(), 'signature', p_signature, 'signedBy', uid::text, 'signedHash', p_hash,
    'signedFrom', left(split_part(coalesce(hdr->>'x-forwarded-for', hdr->>'x-real-ip', ''), ',', 1), 100),
    'signedAgent', left(coalesce(hdr->>'user-agent', ''), 300));
  update public.docs set data = jsonb_set(r.data, '{contract}', c)
    || case when r.data->>'protection' = 'waiver'
         then jsonb_build_object('waiver', coalesce(r.data->'waiver', '{}'::jsonb) || jsonb_build_object('accepted', true, 'acceptedAt', now()))
         else '{}'::jsonb end
    where path = r.path;
  return c - 'signature' - 'html' - 'text';
end $$;

-- "I've sent it" for Venmo and Zelle. The team confirms it once the money shows up.
create or replace function public.client_report_payment(p_id text, p_method text, p_kind text, p_amount numeric, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record; n int; pid text;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into r from public.docs where path = 'bookings/' || p_id and owner = uid;
  if not found then raise exception 'That booking was not found.'; end if;
  if p_method not in ('venmo', 'zelle') then raise exception 'Choose Venmo or Zelle.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Enter the amount you sent.'; end if;
  select count(*) into n from public.docs where coll = 'payments' and owner = uid and data->>'bookingId' = p_id and data->>'status' = 'reported';
  if n >= 5 then raise exception 'We already have your payment notes for this booking. We will confirm them soon.'; end if;
  pid := public._newid('p');
  insert into public.docs (path, data, owner) values ('payments/' || pid, jsonb_build_object(
    'id', pid, 'bookingId', p_id, 'ref', r.data->>'ref', 'method', p_method,
    'kind', case when p_kind in ('deposit', 'balance') then p_kind else 'balance' end,
    'amount', round(p_amount, 2), 'status', 'reported', 'note', left(coalesce(p_note, ''), 200),
    'at', now(), 'by', uid::text), uid);
  return jsonb_build_object('id', pid);
end $$;

create or replace function public.client_cancel(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into r from public.docs where path = 'bookings/' || p_id and owner = uid for update;
  if not found then raise exception 'That booking was not found.'; end if;
  if r.data->>'status' <> 'request' then raise exception 'This booking is already quoted. Get in touch to change or cancel it.'; end if;
  update public.docs set data = data || jsonb_build_object('status', 'cancelled', 'cancelledAt', now(), 'cancelledBy', 'client') where path = r.path;
  return jsonb_build_object('id', p_id, 'status', 'cancelled');
end $$;

create or replace function public.client_save_profile(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); em text; patch jsonb;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select u.email into em from auth.users u where u.id = uid;
  patch := jsonb_build_object('uid', uid::text, 'email', em,
    'name', left(coalesce(p->>'name', ''), 120), 'company', left(coalesce(p->>'company', ''), 120), 'phone', left(coalesce(p->>'phone', ''), 40));
  insert into public.docs (path, data, owner) values ('clients/' || uid::text, patch || '{"docs":[]}'::jsonb, uid)
    on conflict (path) do update set data = public.docs.data || patch;
  return patch;
end $$;

-- Record an insurance certificate or ST-121 the client uploaded to their own storage folder,
-- and attach it to a booking if they name one.
create or replace function public.client_add_doc(p_kind text, p_file text, p_name text, p_expires text, p_booking text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); em text; did text; entry jsonb; n int; r record; exp date := public._date(p_expires);
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if p_kind not in ('coi', 'st121') then raise exception 'Unknown document type.'; end if;
  if p_file is null or p_file not like uid::text || '/%' or p_file like '%..%' or length(p_file) > 300 then raise exception 'Upload the file first.'; end if;
  select u.email into em from auth.users u where u.id = uid;
  insert into public.docs (path, data, owner) values ('clients/' || uid::text, jsonb_build_object('uid', uid::text, 'email', em, 'docs', '[]'::jsonb), uid)
    on conflict (path) do nothing;
  select coalesce(jsonb_array_length(data->'docs'), 0) into n from public.docs where path = 'clients/' || uid::text;
  if n >= 40 then raise exception 'That is a lot of documents. Get in touch and we will tidy them up.'; end if;
  did := public._newid('d');
  entry := jsonb_build_object('id', did, 'kind', p_kind, 'file', p_file, 'name', left(coalesce(p_name, ''), 200),
    'expires', coalesce(exp::text, ''), 'at', now(), 'status', 'new', 'from', 'client');
  update public.docs set data = jsonb_set(data, '{docs}', coalesce(data->'docs', '[]'::jsonb) || jsonb_build_array(entry))
    where path = 'clients/' || uid::text;
  if coalesce(p_booking, '') <> '' then
    select * into r from public.docs where path = 'bookings/' || p_booking and owner = uid for update;
    if found then
      if p_kind = 'coi' then
        update public.docs set data = jsonb_set(data, '{coi}', coalesce(data->'coi', '{}'::jsonb) || jsonb_build_object(
          'status', case when coalesce(data #>> '{coi,status}', 'none') in ('none', 'requested', 'rejected') then 'received' else data #>> '{coi,status}' end,
          'file', p_file, 'docId', did, 'expires', coalesce(exp::text, data #>> '{coi,expires}', '')))
          where path = r.path;
      else
        update public.docs set data = jsonb_set(data, '{tax}', coalesce(data->'tax', '{}'::jsonb) || jsonb_build_object('exempt', true, 'certFile', p_file, 'certDocId', did))
          where path = r.path;
      end if;
    end if;
  end if;
  return entry;
end $$;

-- Jobs the team started with this client's email, from before they signed up.
create or replace function public.claim_my_bookings() returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); em text; n int;
begin
  if uid is null then return 0; end if;
  select u.email into em from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if em is null then return 0; end if;
  update public.docs set owner = uid
    where coll = 'bookings' and owner is null and lower(data #>> '{client,email}') = lower(em);
  get diagnostics n = row_count;
  update public.docs set owner = uid
    where coll = 'payments' and owner is null
      and data->>'bookingId' in (select b.id from public.docs b where b.coll = 'bookings' and b.owner = uid);
  return n;
end $$;

-- What is booked when, for the storefront's availability. No names, prices or notes.
create or replace function public.busy_holds(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'h' || substr(md5(path), 1, 12),
    'status', data->>'status', 'pickup', data->>'pickup', 'returnDate', data->>'returnDate', 'budget', coalesce(data->>'budget', 'A'),
    'lines', (select coalesce(jsonb_agg(jsonb_build_object('id', l->>'id', 'qty', l->'qty', 'tier', coalesce(l->>'tier', 'C'))), '[]'::jsonb)
              from jsonb_array_elements(case when jsonb_typeof(data->'lines') = 'array' then data->'lines' else '[]'::jsonb end) l))), '[]'::jsonb)
  from public.docs
  where coll = 'bookings' and data->>'status' in ('request', 'quoted', 'confirmed', 'out')
    and p_to - p_from <= 400
    and data->>'pickup' <= p_to::text
    and (data->>'returnDate' >= p_from::text or data->>'status' = 'out');
$$;

-- For the server functions only: merge fields into a document in one statement (a payment landing never
-- overwrites an edit made at the same moment).
create or replace function public.merge_doc(p_path text, p_patch jsonb) returns void
language sql security definer set search_path = '' as $$
  update public.docs set data = data || p_patch where path = p_path;
$$;

-- ---------------------------------------------------------------- function access

revoke execute on function public.docs_before(), public.docs_guard() from public, anon, authenticated;
revoke execute on function public.submit_request(jsonb), public.client_sign(text, text, text, text, boolean),
  public.client_report_payment(text, text, text, numeric, text), public.client_cancel(text), public.client_save_profile(jsonb),
  public.client_add_doc(text, text, text, text, text), public.claim_my_bookings(), public.busy_holds(date, date), public.is_admin()
  from public;
revoke execute on function public.merge_doc(text, jsonb) from public, anon, authenticated;
grant execute on function public.merge_doc(text, jsonb) to service_role;
grant execute on function public.is_admin(), public.busy_holds(date, date) to anon, authenticated;
grant execute on function public.submit_request(jsonb), public.client_sign(text, text, text, text, boolean),
  public.client_report_payment(text, text, text, numeric, text), public.client_cancel(text), public.client_save_profile(jsonb),
  public.client_add_doc(text, text, text, text, text), public.claim_my_bookings()
  to authenticated;

-- ---------------------------------------------------------------- files

-- Gear photos: anyone can look, only the team can add or remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('gear', 'gear', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Client paperwork: each client uploads into a folder named after their account; the team reads all of it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('client-docs', 'client-docs', false, 15728640, array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gear: team uploads" on storage.objects;
create policy "gear: team uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'gear' and (select public.is_admin()));
drop policy if exists "gear: team replaces" on storage.objects;
create policy "gear: team replaces" on storage.objects for update to authenticated
  using (bucket_id = 'gear' and (select public.is_admin()));
drop policy if exists "gear: team removes" on storage.objects;
create policy "gear: team removes" on storage.objects for delete to authenticated
  using (bucket_id = 'gear' and (select public.is_admin()));

drop policy if exists "client-docs: upload own" on storage.objects;
create policy "client-docs: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
drop policy if exists "client-docs: read own" on storage.objects;
create policy "client-docs: read own" on storage.objects for select to authenticated
  using (bucket_id = 'client-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
drop policy if exists "client-docs: team removes" on storage.objects;
create policy "client-docs: team removes" on storage.objects for delete to authenticated
  using (bucket_id = 'client-docs' and (select public.is_admin()));

-- ---------------------------------------------------------------- live updates

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
