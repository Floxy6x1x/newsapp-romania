# Teleorman News

Aplicație web (PWA) care afișează ultimele știri din județul Teleorman,
preluate direct de la [teleormannews.ro](https://teleormannews.ro).

## Cum funcționează

- Conținutul este preluat live prin **WordPress REST API**
  (`/wp-json/wp/v2/posts?_embed`) — titluri, rezumate, imagini și categorii.
- Dacă REST API nu e disponibil, aplicația trece automat pe **feed-ul RSS**
  (`/feed/`).
- Pentru că site-ul sursă nu trimite antete CORS, cererile trec printr-un
  **proxy CORS public** (allorigins / corsproxy / codetabs, cu fallback în lanț).
- Categoriile din bara de sus sunt încărcate dinamic din site.
- Funcționează offline parțial (service worker) și e instalabilă ca aplicație
  (PWA) pe telefon sau desktop.

## Funcționalități

- 📰 Ultimele articole, cu articol principal (featured) + grilă de carduri
- 🔎 Căutare instantanee în titluri și rezumate
- 🗂️ Filtrare pe categorii (încărcate din site)
- 🔄 Auto-refresh la fiecare 5 minute + buton manual
- 📤 Distribuire articole (Web Share API / copiere link)
- 📱 PWA instalabilă, responsive

## Rulare locală

Fiind un site static, e suficient orice server HTTP:

```bash
python3 -m http.server 8080
# apoi deschide http://localhost:8080
```

## Deploy

Configurat pentru **Netlify** (`netlify.toml`) — publică rădăcina proiectului.
Merge la fel de bine pe GitHub Pages, Vercel sau orice hosting de fișiere statice.

## Notă legală

Aplicație **neoficială**. Tot conținutul (texte, imagini) aparține publicației
teleormannews.ro; aplicația doar afișează extrase și trimite cititorii către
articolul original de pe site.
