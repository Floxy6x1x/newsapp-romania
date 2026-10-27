// Rulează pe serverele GitHub (GitHub Actions), nu în browser.
// Aduce știri despre Teleorman prin Google News RSS și scrie news.json,
// pe care aplicația îl citește same-origin (fără proxy, fără CORS).

import { writeFileSync } from 'node:fs';

// Teme / localități monitorizate. Google News adună automat din toate ziarele.
const QUERIES = [
  'Teleorman',
  'Alexandria Teleorman',
  'Roșiori de Vede',
  'Turnu Măgurele',
  'Zimnicea',
  'Videle'
];

function gnewsUrl(q) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:14d')}&hl=ro&gl=RO&ceid=RO:ro`;
}

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#38;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? mm[1] : '';
    };
    let title = decode(pick('title'));
    const link = decode(pick('link'));
    const pub = decode(pick('pubDate'));
    const desc = decode(pick('description'));
    let source = decode(pick('source'));
    const i = title.lastIndexOf(' - ');
    if (!source && i > 10) { source = title.slice(i + 3); title = title.slice(0, i); }
    else if (source && i > 10 && title.slice(i + 3).trim() === source) { title = title.slice(0, i); }
    if (title && link) {
      items.push({
        title,
        link,
        date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        summary: desc.slice(0, 220),
        source: source || 'Google News',
        image: ''
      });
    }
  }
  return items;
}

async function fetchQuery(q) {
  try {
    const r = await fetch(gnewsUrl(q), { headers: { 'User-Agent': 'Mozilla/5.0 TeleormanMonitor' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const xml = await r.text();
    const items = parseItems(xml);
    console.log(`  ${q}: ${items.length} articole`);
    return items;
  } catch (e) {
    console.error(`  ${q}: EȘEC — ${e.message}`);
    return [];
  }
}

const all = [];
for (const q of QUERIES) {
  all.push(...await fetchQuery(q));
}

// dedup după titlu normalizat, cele mai noi primele
const seen = new Set();
const articles = all
  .filter((a) => {
    const k = a.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 80);

writeFileSync('news.json', JSON.stringify({ updated: new Date().toISOString(), count: articles.length, articles }, null, 1));
console.log(`Scris news.json cu ${articles.length} articole.`);
