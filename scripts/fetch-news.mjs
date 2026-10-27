// Rulează pe serverele GitHub (GitHub Actions), nu în browser.
// Aduce știri din presa locală Teleorman (feed-uri directe) + Google News,
// și scrie news.json, pe care aplicația îl citește same-origin (fără proxy).

import { writeFileSync } from 'node:fs';

// Ziarele locale din Teleorman — feed RSS direct (server-side, fără blocaje).
const SITES = [
  { name: 'Teleorman News', url: 'https://teleormannews.ro/feed/' },
  { name: 'Ziarul Mara', url: 'https://ziarulmara.ro/feed/' },
  { name: 'Liber în Teleorman', url: 'https://liberinteleorman.ro/feed/' },
  { name: 'Gazeta de Teleorman', url: 'https://gazetadeteleorman.ro/feed/' },
  { name: 'Teleorman Online', url: 'https://teleormanonline.ro/feed/' },
  { name: 'Observatorul de Teleorman', url: 'https://observatoruldeteleorman.ro/feed/' },
  { name: 'Ziarul Teleorman', url: 'https://ziarulteleorman.ro/feed/' },
  { name: '24NewsRo', url: 'https://24newsro.ro/feed/' }
];

// Completare prin Google News (prinde și ce nu are feed propriu).
const QUERIES = ['Teleorman', 'Alexandria Teleorman', 'Roșiori de Vede', 'Turnu Măgurele', 'Zimnicea', 'Videle'];

const CAP_PER_SOURCE = 12; // ca o singură sursă să nu domine
const TOTAL = 90;

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

function parseItems(xml, forcedSource) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const pick = (t) => {
      const mm = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`));
      return mm ? mm[1] : '';
    };
    let title = decode(pick('title'));
    const link = decode(pick('link'));
    const pub = decode(pick('pubDate'));
    const descRaw = pick('content:encoded') || pick('description');
    const desc = decode(descRaw);
    let source = forcedSource || '';
    let srcDomain = '';
    if (!forcedSource) {
      const sm = b.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/);
      if (sm) { srcDomain = sm[1]; source = decode(sm[2]); }
      const i = title.lastIndexOf(' - ');
      if (i > 10 && (!source || title.slice(i + 3).trim() === source)) {
        if (!source) source = title.slice(i + 3).trim();
        title = title.slice(0, i);
      }
    }
    let image = '';
    const im = descRaw.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (im) image = im[1];
    if (!image) { const em = b.match(/<(?:media:content|enclosure)[^>]*url="([^"]+)"/i); if (em) image = em[1]; }
    if (title && link) {
      items.push({
        title, link,
        date: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        summary: desc.slice(0, 220),
        source: source || 'Presă',
        image, srcDomain, local: !!forcedSource
      });
    }
  }
  return items;
}

async function fetchXml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (TeleormanMonitor)' }, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

async function fetchSite(s) {
  try {
    const items = parseItems(await fetchXml(s.url), s.name);
    console.log(`  [local] ${s.name}: ${items.length}`);
    return items;
  } catch (e) { console.error(`  [local] ${s.name}: EȘEC — ${e.message}`); return []; }
}

async function fetchQuery(q) {
  try {
    const items = parseItems(await fetchXml(gnewsUrl(q)), null);
    console.log(`  [google] ${q}: ${items.length}`);
    return items;
  } catch (e) { console.error(`  [google] ${q}: EȘEC — ${e.message}`); return []; }
}

const all = [];
for (const s of SITES) all.push(...await fetchSite(s));
for (const q of QUERIES) all.push(...await fetchQuery(q));

// log domenii Google News (ca să descoperim ce ziare locale mai există)
const domains = [...new Set(all.filter(a => a.srcDomain).map(a => a.srcDomain))];
console.log('Domenii surse Google News:', domains.join(', '));

// dedup după titlu normalizat, local înaintea Google la titluri identice
const seen = new Map();
for (const a of all) {
  const k = a.title.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!k) continue;
  if (!seen.has(k) || (a.local && !seen.get(k).local)) seen.set(k, a);
}
let deduped = [...seen.values()].sort((a, b) => new Date(b.date) - new Date(a.date));

// cap per sursă ca să fie echilibrat
const per = {};
const articles = [];
for (const a of deduped) {
  per[a.source] = per[a.source] || 0;
  if (per[a.source] >= CAP_PER_SOURCE) continue;
  per[a.source]++;
  articles.push({ title: a.title, link: a.link, date: a.date, summary: a.summary, source: a.source, image: a.image });
  if (articles.length >= TOTAL) break;
}

writeFileSync('news.json', JSON.stringify({ updated: new Date().toISOString(), count: articles.length, articles }, null, 1));
console.log(`Scris news.json cu ${articles.length} articole din ${Object.keys(per).length} surse.`);
