import { test, expect, type Page } from '@playwright/test';

// カレンダー連携: a secret .ics feed of 本番・予定・締切 for Google カレンダー / iPhone.
const uid = () => Math.random().toString(36).slice(2, 8);
const ymd = (n: number) => new Date(Date.now() + 9 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10); // Japan time
const d8 = (s: string) => s.replaceAll('-', '');
/** unfold RFC 5545 continuation lines */
const unfold = (s: string) => s.replace(/\r\n /g, '');

async function seed(page: Page) {
  await page.goto(`/auth/dev-login?name=cal-${uid()}`);
  await expect(page.locator('body')).toHaveClass(/ready/);
  const now = Date.now();
  const ev = { id: crypto.randomUUID(), name: '2026 OBOG総会', start_date: ymd(10), end_date: ymd(11), place: '5号館', color: 'orange', created_at: now, updated_at: now };
  const old = { id: crypto.randomUUID(), name: '2025 部同会', start_date: ymd(-30), end_date: ymd(-30), color: 'teal', closed: true, created_at: now, updated_at: now };
  const t = (o: object) => ({ id: crypto.randomUUID(), status: 'todo', created_at: now, updated_at: now, ...o });
  const tasks = [
    t({ title: '幹部読み合わせ', kind: 'event', event_id: ev.id, plan_date: ymd(3), plan_start: '19:00', plan_end: '20:30', tag: '幹部読み合わせ', place: '2号館' }),
    t({ title: '健康診断', kind: 'event', plan_date: ymd(4) }), // その他, all-day
    t({ title: '式次第の確認', kind: 'event', event_id: ev.id, plan_date: ymd(10), plan_start: '13:00' }), // the event's own day: stays out
    t({ title: '案内状の発送', event_id: ev.id, due_date: ymd(5), due_time: '17:00', assignees: ['佐藤', '上田'] }),
    t({ title: '会場予約, 2号館; 確認', event_id: ev.id, due_date: ymd(6) }), // , and ; are escaped
    t({ title: '終わった作業', event_id: ev.id, due_date: ymd(5), status: 'done' }),
    t({ title: '去年の残り', event_id: old.id, due_date: ymd(-29) }),
    t({ title: '本部員集合', event_id: ev.id, plan_date: ymd(10), plan_start: '11:30' }), // 当日の動き
  ];
  expect((await page.request.post('/api/tasks/sync', { data: { events: [ev, old], tasks } })).status()).toBe(200);
  return ev;
}

test.describe('カレンダー連携 @local', () => {
  test('the feed has 本番 (all-day), 予定 (timed, Japan time) and unfinished 締切, and nothing else', async ({ page, request }) => {
    const ev = await seed(page);
    expect((await (await page.request.get('/api/calendar-feed')).json()).url).toBeNull();
    const { url } = await (await page.request.post('/api/calendar-feed')).json();
    expect(url).toMatch(/\/cal\/[A-Za-z0-9_-]{20,}\.ics$/);

    const res = await request.get(url); // no session: the URL itself is the key
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    const raw = await res.text();
    expect(raw.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true); // folded
    const ics = unfold(raw);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('X-WR-CALNAME:Task本部');
    // 本番: all-day over both days (DTEND is the day after)
    expect(ics).toContain('SUMMARY:【本番】2026 OBOG総会');
    expect(ics).toContain(`DTSTART;VALUE=DATE:${d8(ymd(10))}`);
    expect(ics).toContain(`DTEND;VALUE=DATE:${d8(ymd(12))}`);
    expect(ics).toContain(`URL:${new URL(url).origin}/events/${ev.id}`);
    // 予定
    expect(ics).toContain(`DTSTART;TZID=Asia/Tokyo:${d8(ymd(3))}T190000`);
    expect(ics).toContain(`DTEND;TZID=Asia/Tokyo:${d8(ymd(3))}T203000`);
    expect(ics).toContain('SUMMARY:幹部読み合わせ');
    expect(ics).toContain('LOCATION:2号館');
    expect(ics).toContain('SUMMARY:健康診断');
    expect(ics).toContain(`DTSTART;VALUE=DATE:${d8(ymd(4))}`);
    // 締切
    expect(ics).toContain('SUMMARY:締切：案内状の発送（佐藤・上田）');
    expect(ics).toContain(`DTSTART;TZID=Asia/Tokyo:${d8(ymd(5))}T170000`);
    expect(ics).toContain('SUMMARY:締切：会場予約\\, 2号館\\; 確認');
    for (const no of ['終わった作業', '去年の残り', '本部員集合', '式次第の確認']) expect(ics).not.toContain(no);
    expect(ics).toContain('SUMMARY:【本番】2025 部同会'); // a finished event's day stays on the calendar (its leftovers don't)
  });

  test('making a new URL shuts the old one off; stopping removes it', async ({ page, request }) => {
    await seed(page);
    const first = (await (await page.request.post('/api/calendar-feed')).json()).url;
    const second = (await (await page.request.post('/api/calendar-feed')).json()).url;
    expect(second).not.toBe(first);
    expect((await request.get(first)).status()).toBe(404);
    expect((await request.get(second)).status()).toBe(200);
    await page.request.delete('/api/calendar-feed');
    expect((await request.get(second)).status()).toBe(404);
  });

  test('the カレンダー連携 screen makes the URL with Google and iPhone buttons', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    await page.getByTestId('avatar').click();
    await page.getByTestId('calfeed').click();
    await page.getByTestId('nx-calfeed-make').click();
    const url = await page.getByTestId('nx-calfeed-url').textContent();
    expect(url).toMatch(/\/cal\/.+\.ics$/);
    await expect(page.getByTestId('nx-calfeed-google')).toHaveAttribute('href', `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url!.replace(/^https?:/, 'webcal:'))}`);
    await expect(page.getByTestId('nx-calfeed-webcal')).toHaveAttribute('href', url!.replace(/^https?:/, 'webcal:'));
    // 作り直す asks first
    await page.getByTestId('nx-calfeed-renew').click();
    await page.getByTestId('nx-calfeed-renew-ok').click();
    await expect(page.getByTestId('nx-calfeed-url')).not.toHaveText(url!);
  });
});
