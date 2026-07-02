# Monitor Presă Teleorman

Aplicație web (PWA) pentru **monitorizarea presei locale din județul Teleorman**.
Adună mai multe ziare locale într-un **singur feed cronologic**, cu **alerte pe
cuvinte cheie** și **marcare citit/necitit**. Uz personal.

## Cum funcționează

- Fiecare sursă e un site de știri; aplicația citește **feed-ul RSS** al fiecăruia
  (`https://<domeniu>/feed/`), le combină, elimină duplicatele și le sortează
  **cronologic (cele mai noi primele)**.
- Pentru că site-urile nu trimit antete CORS, cererile trec printr-un **proxy CORS
  public** (allorigins / corsproxy / codetabs, cu fallback în lanț).
- Totul rulează în browser; datele tale (surse, cuvinte cheie, articole citite,
  temă) sunt salvate local, în `localStorage`. Nu există server propriu.

## Funcționalități

- 🗞️ **Surse multiple, editabile** — adaugi/ștergi domenii direct din aplicație
  (butonul 🗞️). Fiecare sursă arată status: ✓ câte articole / ✗ nu răspunde.
- 🔔 **Alerte pe cuvinte cheie** — definești cuvinte (nume, localități, teme);
  articolele care le conțin sunt evidențiate și filtrabile în tab-ul „Alerte”.
- 📰 **Feed cronologic simplu** — listă densă, ușor de scanat.
- ✅ **Citit / necitit** — punct pe articolele noi, badge cu numărul de necitite,
  „Marchează tot citit”. Filtru „Necitite”.
- 🔎 Căutare instantanee în toate sursele.
- 🌙 Mod întunecat.
- 🔄 Auto-refresh la 5 minute + buton manual.
- 📱 PWA instalabilă pe telefon/desktop.

## Surse implicite

Aplicația pornește cu câteva domenii din Teleorman ca punct de plecare. **Verifică-le
în panoul 🗞️**: cele care apar cu „✗ nu răspunde” nu au feed RSS accesibil la
`/feed/` — șterge-le și adaugă exact ziarele pe care le urmărești tu.

> Notă: din unele medii de dezvoltare (sandbox) accesul la aceste site-uri e
> blocat de rețea, dar în browserul tău normal feed-urile funcționează.

## Rulare locală

```bash
python3 -m http.server 8080
# deschide http://localhost:8080
```

## Deploy

Configurat pentru **Netlify** (`netlify.toml`). Merge și pe GitHub Pages, Vercel
sau orice hosting de fișiere statice.
