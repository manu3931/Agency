-- Who can see and do what, run against the migration on a stubbed Supabase (see run.sh).
\set ON_ERROR_STOP 1
\set QUIET 1
create function pg_temp.fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;
create function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return ''; exception when others then return sqlerrm; end $$;

-- people: two of the team (one never confirmed their email), three clients
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'Manu@Example.com', now()),
  ('00000000-0000-0000-0000-00000000000b', 'sean@example.com', null),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@example.com', now()),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@example.com', now());
insert into public.docs (path, data) values
  ('team/manu@example.com', '{"email":"manu@example.com"}'),
  ('team/sean@example.com', '{"email":"sean@example.com"}'),
  ('settings/company', '{"company":"Shared Gear Pool","studentPct":15,"payVenmo":"pool"}'),
  ('catalog/current', '{"payload":"private"}'),
  ('catalog/public', '{"payload":"public"}'),
  ('fund/plan', '{"order":[]}'),
  ('photos/S-ELE-100', '{"list":[]}'),
  ('bookings/job1', '{"id":"job1","status":"quoted","client":{"email":"C1@example.com"},"pickup":"2030-01-10","returnDate":"2030-01-12","lines":[{"id":"S-ELE-100","qty":1,"tier":"C"}],"notes":"n","protection":"waiver","contract":{"status":"draft"}}'),
  ('bookings/job2', '{"id":"job2","status":"confirmed","client":{"email":"c2@example.com"},"pickup":"2030-01-11","returnDate":"2030-01-13","lines":[{"id":"S-ELE-100","qty":1,"tier":"C"}]}'),
  ('bookings/job3', '{"id":"job3","status":"quoted","client":{"email":"c3@example.com"},"pickup":"2030-02-01","returnDate":"2030-02-02","lines":[]}');

do $$ begin
  assert (select owner from public.docs where path = 'bookings/job1') = '00000000-0000-0000-0000-0000000000c1', 'a job links to the client whose confirmed email is on it';
  assert (select owner from public.docs where path = 'bookings/job3') is null, 'a job for someone who has not signed up has no owner';
  assert (select coll || '|' || id from public.docs where path = 'bookings/job1') = 'bookings|job1', 'coll and id follow the path';
end $$;

-- ---------------- anyone
set role anon; set request.jwt.claims = '';
do $$ begin
  assert (select count(*) from public.docs) = 3, 'a visitor sees only settings/company, catalog/public and photos, saw ' || (select string_agg(path, ',') from public.docs);
  assert not public.is_admin(), 'a visitor is not on the team';
  assert pg_temp.fails($q$insert into public.docs (path, data) values ('bookings/x', '{}')$q$), 'a visitor cannot write';
  assert jsonb_array_length(public.busy_holds('2030-01-01', '2030-01-31')) = 2, 'availability shows both January holds';
  assert (select public.busy_holds('2030-01-01', '2030-01-31')::text) !~ '(email|notes|c1@)', 'availability carries no names, emails or notes';
  assert pg_temp.fails($q$select public.submit_request('{}')$q$), 'a visitor cannot send a request without signing in';
  assert pg_temp.fails($q$select public.merge_doc('bookings/job1', '{"status":"closed"}')$q$), 'only the server functions can merge into documents';
end $$;
reset role;

-- ---------------- an unconfirmed email on the team list
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
do $$ begin
  assert not public.is_admin(), 'a team email that was never confirmed does not get in';
  assert (select count(*) from public.docs where coll = 'bookings') = 0, 'and sees no jobs';
end $$;
reset role;

-- ---------------- client 1
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1"}';
do $$
declare r jsonb; b jsonb; n int;
begin
  assert not public.is_admin(), 'a client is not on the team';
  assert (select string_agg(id, ',') from public.docs where coll = 'bookings') = 'job1', 'a client sees only their own job';
  assert (select count(*) from public.docs where coll in ('catalog', 'fund', 'team') and id <> 'public') = 0, 'a client sees no private catalog, fund or team';
  update public.docs set data = data || '{"status":"confirmed"}' where path = 'bookings/job1';
  assert (select data->>'status' from public.docs where path = 'bookings/job1') = 'quoted', 'a client cannot change a job directly';
  assert pg_temp.fails($q$insert into public.docs (path, data) values ('bookings/mine', '{}')$q$), 'a client cannot insert rows';
  assert pg_temp.fails($q$select public.merge_doc('bookings/job1', '{"status":"closed"}')$q$), 'nor can a client';

  r := public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","shootDays":1,"status":"confirmed","favor":true,
    "client":{"name":"Cee One","email":"spoof@example.com"},"discount":{"kind":"custom","pct":100},
    "lines":[{"id":"S-ELE-100","qty":2,"rate":0,"comp":true},{"id":"<script>","qty":1}],"crew":[{"role":"Gaffer","rate":900,"people":1}],
    "protection":"hold","tax":{"exempt":true},"contract":{"status":"signed"}}');
  select data into b from public.docs where path = 'bookings/' || (r->>'id');
  assert b->>'status' = 'request' and b->>'source' = 'storefront', 'a request always arrives as a new request';
  assert b #>> '{client,email}' = 'c1@example.com', 'the email on a request is the signed-in account''s';
  assert (b->>'favor')::boolean = false and b #>> '{discount,kind}' = 'none', 'a request cannot give itself favors or discounts';
  assert jsonb_array_length(b->'lines') = 1 and b #> '{lines,0,rate}' = 'null'::jsonb and (b #>> '{lines,0,comp}')::boolean = false, 'lines keep only valid gear, with no price set';
  assert b #>> '{contract,status}' = 'draft', 'a request cannot mark its own agreement signed';
  assert (b #>> '{tax,exempt}')::boolean and not (b #>> '{tax,cert}')::boolean, 'tax exemption is a claim until the certificate is in';
  assert b ? 'ref' and b->>'ref' ~ '^SGP-[0-9]{6}-[0-9A-F]{3}$', 'requests get a reference like the desk''s: ' || (b->>'ref');
  r := public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[{"id":"S-ELE-100"}],"discount":{"kind":"student"}}');
  assert (select data #>> '{discount,pct}' from public.docs where path = 'bookings/' || (r->>'id')) = '15', 'the student discount comes from Settings';
  assert pg_temp.err($q$select public.submit_request('{"pickup":"2027-03-09","returnDate":"2027-03-06","lines":[{"id":"S-ELE-100"}]}')$q$) like 'Pick a pickup date%', 'backwards dates are refused';
  assert pg_temp.err($q$select public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[]}')$q$) like 'Add at least one%', 'an empty request is refused';
  perform public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[{"id":"S-ELE-100"}]}');
  perform public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[{"id":"S-ELE-100"}]}');
  perform public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[{"id":"S-ELE-100"}]}');
  assert pg_temp.err($q$select public.submit_request('{"pickup":"2027-03-06","returnDate":"2027-03-09","lines":[{"id":"S-ELE-100"}]}')$q$) like 'You already have 5%', 'no more than five waiting requests';

  assert pg_temp.err($q$select public.client_cancel('job1')$q$) like 'This booking is already quoted%', 'a quoted job cannot be cancelled by the client';
  select public.client_cancel(r->>'id') into b;
  assert (select data->>'status' from public.docs where path = 'bookings/' || (r->>'id')) = 'cancelled', 'a waiting request can be cancelled';

  assert pg_temp.err($q$select public.client_sign('job1', 'Cee One', 'data:image/png;base64,AAAA', 'x', true)$q$) like 'This agreement is not ready%', 'nothing to sign until the team sends it';
end $$;
reset role;

-- the team sends the agreement
update public.docs set data = jsonb_set(data, '{contract}', '{"status":"sent","text":"AGREEMENT job1 — total $100"}') where path = 'bookings/job1';

set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1"}';
do $$
declare h text := encode(sha256(convert_to('AGREEMENT job1 — total $100', 'UTF8')), 'hex'); c jsonb; p jsonb; d jsonb;
begin
  assert pg_temp.err(format($q$select public.client_sign('job1', 'Cee One', 'data:image/png;base64,AAAA', 'wrong', true)$q$)) like 'The agreement changed%', 'a stale copy cannot be signed';
  assert pg_temp.err(format($q$select public.client_sign('job1', 'Cee One', 'data:image/png;base64,AAAA', %L, false)$q$, h)) like 'Tick the box%', 'signing needs consent to sign electronically';
  assert pg_temp.err(format($q$select public.client_sign('job1', 'Cee One', 'javascript:alert(1)', %L, true)$q$, h)) like 'Draw your signature%', 'the signature must be a PNG image';
  c := public.client_sign('job1', 'Cee One', 'data:image/png;base64,AAAA', h, true);
  assert c->>'status' = 'signed' and c->>'signer' = 'Cee One', 'the agreement is signed';
  assert (select (data #>> '{waiver,accepted}')::boolean from public.docs where path = 'bookings/job1'), 'signing accepts the damage waiver on a waiver job';
  assert pg_temp.fails(format($q$select public.client_sign('job1', 'Cee One', 'data:image/png;base64,AAAA', %L, true)$q$, h)), 'it cannot be signed twice';

  p := public.client_report_payment('job1', 'venmo', 'deposit', 25.555, 'sent from @cee');
  assert (select (data->>'status') || (data->>'amount') from public.docs where path = 'payments/' || (p->>'id')) = 'reported25.56', 'a Venmo payment is noted for the team to confirm';
  assert pg_temp.fails($q$select public.client_report_payment('job1', 'bitcoin', 'deposit', 5, '')$q$), 'only Venmo and Zelle can be reported';
  assert pg_temp.fails($q$select public.client_report_payment('job2', 'zelle', 'deposit', 5, '')$q$), 'nobody reports payments on someone else''s job';

  perform public.client_save_profile('{"name":"Cee One","company":"Cee Films","phone":"555","email":"spoof@example.com"}');
  assert (select data->>'email' from public.docs where path = 'clients/00000000-0000-0000-0000-0000000000c1') = 'c1@example.com', 'a profile keeps the account''s own email';
  assert pg_temp.fails($q$select public.client_add_doc('coi', '00000000-0000-0000-0000-0000000000c2/coi.pdf', 'coi.pdf', '2031-01-01', 'job1')$q$), 'a document must be in the client''s own folder';
  d := public.client_add_doc('coi', '00000000-0000-0000-0000-0000000000c1/coi.pdf', 'coi.pdf', '2031-01-01', 'job1');
  assert (select data #>> '{coi,status}' || '|' || (data #>> '{coi,expires}') from public.docs where path = 'bookings/job1') = 'received|2031-01-01', 'an uploaded certificate marks the job''s certificate received';
  perform public.client_add_doc('st121', '00000000-0000-0000-0000-0000000000c1/st121.pdf', 'st121.pdf', null, 'job1');
  assert (select (data #>> '{tax,exempt}') || '|' || coalesce(data #>> '{tax,cert}', 'false') from public.docs where path = 'bookings/job1') = 'true|false', 'an ST-121 claims the exemption but waits for the team to accept it';

  insert into storage.objects (bucket_id, name) values ('client-docs', '00000000-0000-0000-0000-0000000000c1/a.pdf');
  assert pg_temp.fails($q$insert into storage.objects (bucket_id, name) values ('client-docs', '00000000-0000-0000-0000-0000000000c2/a.pdf')$q$), 'clients upload only into their own folder';
  assert pg_temp.fails($q$insert into storage.objects (bucket_id, name) values ('gear', 'items/x.jpg')$q$), 'clients cannot add gear photos';
end $$;
reset role;

-- ---------------- client 2 sees none of client 1's things
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2"}';
do $$ begin
  assert (select string_agg(path, ',') from public.docs where coll in ('bookings', 'payments', 'clients')) = 'bookings/job2', 'another client sees only their own job';
  assert (select count(*) from storage.objects) = 0, 'and none of the first client''s files';
end $$;
reset role;

-- ---------------- someone signs up after the team started their job
insert into public.docs (path, data) values ('payments/pay3', '{"id":"pay3","bookingId":"job3","amount":50,"status":"received"}');
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000c3', 'c3@example.com', now());
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3"}';
do $$ begin
  assert (select count(*) from public.docs where coll = 'bookings') = 0, 'before claiming, the new client sees nothing';
  assert public.claim_my_bookings() = 1, 'claiming finds the job with their email';
  assert (select count(*) from public.docs where coll = 'payments') = 1, 'and the payment the team recorded on it';
  assert (select string_agg(id, ',') from public.docs where coll = 'bookings') = 'job3', 'and then they see it';
end $$;
reset role;

-- ---------------- the team
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
do $$ begin
  assert public.is_admin(), 'a confirmed team email is on the team, whatever its case';
  assert (select count(*) from public.docs where coll = 'bookings') = 8, 'the team sees every job: ' || (select count(*) from public.docs where coll = 'bookings');
  insert into public.docs (path, data) values ('bookings/job4', '{"id":"job4","status":"quoted","client":{"email":"c2@example.com"}}');
  assert (select owner from public.docs where path = 'bookings/job4') = '00000000-0000-0000-0000-0000000000c2', 'a job the team starts links to the client''s account';
  update public.docs set data = data || '{"client":{"email":"nobody@example.com"}}' where path = 'bookings/job4';
  assert (select owner from public.docs where path = 'bookings/job4') is null, 'changing the email unlinks it';
  insert into public.docs (path, data) values ('payments/pay1', '{"id":"pay1","bookingId":"job1","method":"cash","amount":20,"status":"received"}');
  assert (select owner from public.docs where path = 'payments/pay1') = '00000000-0000-0000-0000-0000000000c1', 'a payment the team records belongs to the job''s client';
  assert pg_temp.fails($q$insert into public.docs (path, data) values ('team/Loud@Example.com', '{}')$q$), 'team emails are lower case';
  insert into storage.objects (bucket_id, name) values ('gear', 'items/S-ELE-100/a.jpg');
  delete from public.docs where path = 'team/sean@example.com';
  assert pg_temp.err($q$delete from public.docs where path = 'team/manu@example.com'$q$) like 'Keep at least one%', 'the last person on the team cannot be removed';
  assert (select count(*) from storage.objects where bucket_id = 'client-docs') = 1, 'the team can read client paperwork';
end $$;
reset role;
\echo all access checks passed
