// docs/HANDOVER.md → docs/HANDOVER.html (one file you can open, print or send). Run: npm run handover:html
// A small converter for the Markdown the guide uses: headings, paragraphs, lists, checkboxes, tables, links, **bold**, `code`, ---.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../docs/HANDOVER.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// same ids as GitHub's Markdown, so links like [5章](#5-直したいとき後任のpcで) keep working
const slug = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');

function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    // links inside the repo point at GitHub, so they work from the HTML file too
    const href = /^(https?:|#)/.test(u) ? u : `https://github.com/CIT-taa-event/flicktask/blob/main/${u.replace(/^\.\.\//, '').replace(/^\.\//, 'docs/')}`;
    return `<a href="${href}">${t}</a>`;
  });
  s = s.replace(/(^|[\s（(])(https?:\/\/[^\s<）)]+)/g, (_, pre, u) => `${pre}<a href="${u}">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

const lines = src.split('\n');
const out = [];
const toc = [];
let title = 'Task本部 管理者向け引継ぎ書';
for (let i = 0; i < lines.length; ) {
  const l = lines[i];
  if (!l.trim()) { i++; continue; }
  let m;
  if ((m = l.match(/^(#{1,3}) (.*)$/))) {
    const level = m[1].length, text = m[2];
    if (level === 1) { title = text; out.push(`<h1>${inline(text)}</h1>`); }
    else {
      const id = slug(text);
      if (level === 2) toc.push({ id, text });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
    }
    i++; continue;
  }
  if (/^---+$/.test(l.trim())) { out.push('<hr />'); i++; continue; }
  if (l.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
    const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const [head, , ...body] = rows;
    out.push('<div class="table"><table><thead><tr>' + cells(head).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
      body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
    continue;
  }
  if (/^- /.test(l)) {
    const items = [];
    while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
    const checks = items.every((t) => /^\[[ x]\] /.test(t));
    out.push(`<ul${checks ? ' class="checks"' : ''}>` + items.map((t) => checks ? `<li><label><input type="checkbox"${t[1] === 'x' ? ' checked' : ''} /> ${inline(t.slice(4))}</label></li>` : `<li>${inline(t)}</li>`).join('') + '</ul>');
    continue;
  }
  if (/^\d+\. /.test(l)) {
    const items = [];
    while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''));
    out.push('<ol>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ol>');
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||- |\d+\. |---+$)/.test(lines[i])) para.push(lines[i++]);
  out.push(`<p>${para.map(inline).join('<br />')}</p>`);
}

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<!-- generated from docs/HANDOVER.md by scripts/handover-html.mjs — edit the .md, then run: npm run handover:html -->
<style>
  :root { --bg: #f6f6f6; --paper: #ffffff; --text: #1b1b1b; --sub: #555; --muted: #8a8a8a; --line: #e4e4e4; --accent: #2f5fd0; --code: #f0f0f0; --head: #fafafa; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b0b0b; --paper: #151515; --text: #ececec; --sub: #b4b4b4; --muted: #808080; --line: #2a2a2a; --accent: #8ea8ff; --code: #222; --head: #1b1b1b; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.8 "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", "Meiryo", system-ui, sans-serif; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 32px 16px 64px; }
  .paper { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 36px 40px; }
  h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.4; }
  h2 { margin: 40px 0 12px; padding-bottom: 6px; font-size: 20px; border-bottom: 2px solid var(--line); }
  h3 { margin: 26px 0 8px; font-size: 16.5px; }
  p { margin: 10px 0; }
  a { color: var(--accent); overflow-wrap: anywhere; }
  code { padding: 1px 6px; border-radius: 6px; background: var(--code); font: 13px/1.6 ui-monospace, "Cascadia Mono", Consolas, monospace; overflow-wrap: anywhere; }
  ul, ol { margin: 8px 0; padding-left: 1.5em; }
  li { margin: 3px 0; }
  ul.checks { list-style: none; padding-left: 0.2em; }
  ul.checks input { width: 16px; height: 16px; vertical-align: -2px; margin-right: 6px; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
  .table { overflow-x: auto; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: var(--head); white-space: nowrap; }
  nav.toc { margin: 18px 0 8px; padding: 14px 18px; border-radius: 12px; background: var(--head); border: 1px solid var(--line); font-size: 14px; }
  nav.toc b { display: block; margin-bottom: 4px; }
  nav.toc ol { margin: 0; }
  .foot { margin-top: 18px; font-size: 12px; color: var(--muted); text-align: center; }
  @media (max-width: 640px) { .paper { padding: 22px 16px; border-radius: 12px; } h1 { font-size: 22px; } }
  @media print { body { background: #fff; color: #000; } .wrap { padding: 0; max-width: none; } .paper { border: 0; padding: 0; } nav.toc { break-after: avoid; } h2, h3 { break-after: avoid; } tr { break-inside: avoid; } a { color: #000; } }
</style>
</head>
<body>
<div class="wrap">
<main class="paper">
${out[0]}
<nav class="toc"><b>目次</b><ol>${toc.map((t) => `<li><a href="#${t.id}">${inline(t.text.replace(/^\d+\.\s*/, ''))}</a></li>`).join('')}</ol></nav>
${out.slice(1).join('\n')}
</main>
<p class="foot">docs/HANDOVER.md から作成（${new Date().toLocaleDateString('ja-JP')}）。内容を変えるときは .md を直して <code>npm run handover:html</code></p>
</div>
</body>
</html>
`;
writeFileSync(new URL('../docs/HANDOVER.html', import.meta.url), html);
console.log(`docs/HANDOVER.html: ${toc.length} sections`);
