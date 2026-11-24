// カレンダー連携: the account's events, 予定 and 締切 as an iCalendar feed (RFC 5545) for Google カレンダー / iPhone.
// One-way: the calendars poll it (Google every few hours, iPhone as set). Times are Japan time.
// Each event's own timetable (当日の動き) stays out, as in the app's month view.

type Task = {
  id: string; title: string; status: string; kind: string; event_id: string | null; assignees: string; note: string; place: string; tag: string;
  due_date: string | null; due_time: string | null; plan_date: string | null; plan_start: string | null; plan_end: string | null; plan_end_date: string | null;
};
type Ev = { id: string; name: string; start_date: string; end_date: string; place: string; closed: number };

/** How far back the feed reaches; everything ahead is included. */
const PAST_DAYS = 60;

const jstToday = (now: number) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const d8 = (s: string) => s.replaceAll('-', '');
const t6 = (hhmm: string) => `${hhmm.replace(':', '')}00`;
const plusMin = (hhmm: string, min: number) => {
  const m = Math.min(23 * 60 + 59, Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + min);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
/** TEXT values: escape \ ; , and newlines. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Content lines are folded at 75 octets (UTF-8), never inside a character. */
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) out.push(cur), (cur = ''), (bytes = 0);
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const people = (json: string) => {
  try {
    const a = JSON.parse(json) as string[];
    return a.length ? a.join('・') : '';
  } catch {
    return '';
  }
};

export async function feedFor(db: D1Database, userId: string, appUrl: string, now = Date.now()) {
  const from = addDays(jstToday(now), -PAST_DAYS);
  const [t, e] = await db.batch([
    db.prepare(
      `SELECT id, title, status, kind, event_id, assignees, note, place, tag, due_date, due_time, plan_date, plan_start, plan_end, plan_end_date
       FROM tasks WHERE user_id = ?1 AND deleted = 0 AND (
         (kind = 'event' AND COALESCE(plan_end_date, plan_date) >= ?2) OR (kind = 'task' AND status != 'done' AND due_date >= ?2))`,
    ).bind(userId, from),
    db.prepare('SELECT id, name, start_date, end_date, place, closed FROM events WHERE user_id = ? AND deleted = 0 AND end_date >= ?').bind(userId, from),
  ]);
  return ics(t.results as Task[], e.results as Ev[], appUrl, now);
}

export function ics(tasks: Task[], events: Ev[], appUrl: string, now = Date.now()) {
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const byId = new Map(events.map((e) => [e.id, e]));
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Task本部//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Task本部', 'X-WR-TIMEZONE:Asia/Tokyo', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Tokyo', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0900', 'TZOFFSETTO:+0900', 'TZNAME:JST', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  const vevent = (uid: string, fields: string[]) => lines.push('BEGIN:VEVENT', `UID:${uid}@task-honbu`, `DTSTAMP:${stamp}`, ...fields, 'END:VEVENT');
  const allDay = (start: string, endInclusive: string) => [`DTSTART;VALUE=DATE:${d8(start)}`, `DTEND;VALUE=DATE:${d8(addDays(endInclusive, 1))}`];
  const timed = (date: string, start: string, end: string) => [`DTSTART;TZID=Asia/Tokyo:${d8(date)}T${t6(start)}`, `DTEND;TZID=Asia/Tokyo:${d8(date)}T${t6(end)}`];

  // イベント: the 本番 days
  for (const e of events) {
    vevent(`event-${e.id}`, [...allDay(e.start_date, e.end_date), `SUMMARY:${esc(`【本番】${e.name}`)}`, ...(e.place ? [`LOCATION:${esc(e.place)}`] : []), `URL:${appUrl}events/${e.id}`]);
  }
  for (const t of tasks) {
    const e = (t.event_id && byId.get(t.event_id)) || null;
    if (e?.closed) continue; // a finished event's leftovers stay in 過去資料
    // a timed 予定 on its event's own days belongs to that day's timetable, not the calendar
    const dayOf = !!e && !!t.plan_date && !!t.plan_start && e.start_date <= t.plan_date && t.plan_date <= e.end_date;
    if (t.kind === 'event' && t.plan_date && !dayOf) {
      // 予定 (MTG・読み合わせ…, and those of 「その他」)
      const when = t.plan_start ? timed(t.plan_date, t.plan_start, t.plan_end && t.plan_end > t.plan_start ? t.plan_end : plusMin(t.plan_start, 60)) : allDay(t.plan_date, t.plan_end_date ?? t.plan_date);
      const desc = [e ? e.name : 'その他', t.tag && `タグ：${t.tag}`, t.note].filter(Boolean).join('\n');
      vevent(`plan-${t.id}`, [...when, `SUMMARY:${esc(t.title)}`, `DESCRIPTION:${esc(desc)}`, ...(t.place ? [`LOCATION:${esc(t.place)}`] : []), `URL:${appUrl}${e ? `events/${e.id}?tab=sched` : 'calendar'}`]);
    } else if (t.kind === 'task' && t.status !== 'done' && t.due_date) {
      // 準備 deadlines (unfinished only)
      const who = people(t.assignees);
      const desc = [e ? e.name : 'その他', who && `担当：${who}`, t.status === 'doing' ? '進行中' : '未着手', t.note].filter(Boolean).join('\n');
      const when = t.due_time ? timed(t.due_date, t.due_time, plusMin(t.due_time, 15)) : allDay(t.due_date, t.due_date);
      vevent(`due-${t.id}`, [...when, `SUMMARY:${esc(`締切：${t.title}${who ? `（${who}）` : ''}`)}`, `DESCRIPTION:${esc(desc)}`, 'TRANSP:TRANSPARENT', `URL:${appUrl}events/${e?.id ?? 'other'}`]);
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
