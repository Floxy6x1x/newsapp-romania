// Rulează pe serverele GitHub (GitHub Actions), nu în browser.
// Aduce DOAR presa locală din Teleorman: feed-uri RSS directe + sursele
// locale găsite prin Google News. Scrie news.json (citit same-origin de app).

import { writeFileSync } from 'node:fs';

// Ziarele locale din Teleorman cu feed RSS direct (cele confirmate / probabile).
const SITES = [
  { name: 'Liber în Teleorman', url: 'https://liberinteleorman.ro/feed/' },
  { name: 'Ziarul Teleormanul', url: 'https://ziarulteleormanul.ro/feed/' },
  { name: 'ImpactNews24', url: 'https://impactnews24.ro/feed/' },
  { name: 'Total Impact', url: 'https://totalimpact.ro/feed/' },
  { name: 'Exploziv News 24', url: 'https://explozivnews24.ro/feed/' },
  { name: 'Teleorman News', url: 'https://teleormannews.ro/feed/' }
];

// Domeniile considerate „presă locală Teleorman" — folosite ca filtru pentru
// rezultatele Google News (restul, naționale, sunt eliminate ca zgomot).
const LOCAL = [
  'liberinteleorman.ro', 'ziarulteleormanul.ro', 'impactnews24.ro', 'totalimpact.ro',
  'explozivnews24.ro', 'teleormannews.ro', '24newsro.ro',
  'ziarulmara.ro', 'gazetadeteleorman.ro', 'teleormanonline.ro', 'observatoruldeteleorman.ro',
  'ziarulteleorman.ro', 'teleorman'
];

const QUERIES = ['Teleorman', 'Alexandria Teleorman', 'Roșiori de Vede', 'Turnu Măgurele', 'Zimnicea', 'Videle'];

const CAP_PER_SOURCE = 15;
const TOTAL = 90;

function gnewsUrl(q) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:21d')}&hl=ro&gl=RO&ceid=RO:ro`;
}
function isLocal(domain) {
  if (!domain) return false;
  const d = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  return LOCAL.some((x) => d.includes(x));
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
        source: source || 'Presă', image, srcDomain, local: !!forcedSource
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
  try { const items = parseItems(await fetchXml(s.url), s.name); console.log(`  [local] ${s.name}: ${items.length}`); return items; }
  catch (e) { console.error(`  [local] ${s.name}: EȘEC — ${e.message}`); return []; }
}
async function fetchQuery(q) {
  try { const items = parseItems(await fetchXml(gnewsUrl(q)), null); console.log(`  [google] ${q}: ${items.length}`); return items; }
  catch (e) { console.error(`  [google] ${q}: EȘEC — ${e.message}`); return []; }
}

const all = [];
for (const s of SITES) all.push(...await fetchSite(s));
for (const q of QUERIES) all.push(...await fetchQuery(q));

// Păstrează doar presa locală: feed direct SAU sursă Google dintr-un domeniu local.
const local = all.filter((a) => a.local || isLocal(a.srcDomain));
console.log(`Articole locale: ${local.length} din ${all.length} totale.`);

// dedup după titlu, preferă feed-ul direct
const seen = new Map();
for (const a of local) {
  const k = a.title.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!k) continue;
  if (!seen.has(k) || (a.local && !seen.get(k).local)) seen.set(k, a);
}
const deduped = [...seen.values()].sort((a, b) => new Date(b.date) - new Date(a.date));

// echilibrare: maxim CAP_PER_SOURCE per sursă
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
console.log(`Scris news.json cu ${articles.length} articole din ${Object.keys(per).length} surse locale.`);
