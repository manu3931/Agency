/* The team's calendar feed: every pickup, shoot and return as an .ics subscription, with a reminder the day
   before each return. Anyone holding the link can read it, so the link carries a long random token that the
   team can replace from Settings. Deployed without Supabase's JWT check, because calendar apps can't sign in. */
import { db, json, sameText, type Json } from '../_shared/desk.ts';

const pad = (n: number) => String(n).padStart(2, '0');
const text = (x: unknown) => String(x ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const when = (d: string, t: string) => d.replace(/-/g, '') + 'T' + String(t || '09:00').replace(':', '') + '00';
const addDays = (d: string, n: number) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd + n)); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`; };
const TZ = ['BEGIN:VTIMEZONE', 'TZID:America/New_York', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD', 'END:VTIMEZONE'];
const fold = (line: string) => { const out: string[] = []; let x = line; while (x.length > 74) { out.push(x.slice(0, 74)); x = ' ' + x.slice(74); } out.push(x); return out.join('\r\n'); };

export function ics(bookings: Json[], company: string, place: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shared Gear Pool//Rental desk//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${text(company + ' jobs')}`, 'X-WR-TIMEZONE:America/New_York', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', ...TZ];
  for (const b of bookings) {
    const title = b.project || b.ref; const c = b.client || {}; const who = c.company || c.name || ''; const h = b.handoff || {};
    const where = (m: string) => (m === 'delivery' ? h.address || 'Delivery' : m === 'afterhours' ? 'After-hours handoff' : place);
    const note = `${b.ref}${who ? ' · ' + who : ''} · ${b.status}`;
    const ev = (uid: string, lines: string[]) => L.push('BEGIN:VEVENT', `UID:${b.id}-${uid}@sharedgearpool`, `DTSTAMP:${stamp}`, ...lines, 'END:VEVENT');
    if (b.pickup) ev('out', [`DTSTART;TZID=America/New_York:${when(b.pickup, b.pickupTime || '15:00')}`, 'DURATION:PT30M', `SUMMARY:${text('Gear goes out: ' + title)}`, `LOCATION:${text(where(h.out))}`, `DESCRIPTION:${text(note)}`]);
    if (b.returnDate) ev('back', [`DTSTART;TZID=America/New_York:${when(b.returnDate, b.returnTime || '10:00')}`, 'DURATION:PT30M', `SUMMARY:${text('Gear comes back: ' + title)}`, `LOCATION:${text(where(h.back))}`, `DESCRIPTION:${text(note)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text('Due back tomorrow: ' + title)}`, 'TRIGGER:-P1D', 'END:VALARM']);
    if (Number(b.shootDays) > 0) { const st = b.shootStart || b.pickup; ev('shoot', [`DTSTART;VALUE=DATE:${st.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(st, Number(b.shootDays)).replace(/-/g, '')}`, `SUMMARY:${text('On set: ' + title)}`, `DESCRIPTION:${text(note)}`]); }
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

export async function handler(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get('token') || '';
  const secret = await db.get('secrets/calendar');
  const want = String((secret && secret.data && secret.data.token) || '');
  if (!want || token.length < 32 || !sameText(token, want)) return json({ error: 'This calendar link is not valid. Make a new one in Settings.' }, 404);
  const since = addDays(new Date().toISOString().slice(0, 10), -60);
  const jobs = (await db.list('bookings')).map((r) => r.data).filter((b) => b && b.status !== 'cancelled' && b.pickup && b.returnDate && b.returnDate >= since);
  const s = await db.get('settings/company'); const S = (s && s.data) || {};
  return new Response(ics(jobs, S.company || 'Shared Gear Pool', S.pickup || ''), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300' } });
}

if (import.meta.main) Deno.serve(handler);
