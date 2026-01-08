# 📋 AINOVA Részletes Fejlesztési Terv

**Verzió:** 1.0  
**Készült:** 2026. január 8.  
**Cél:** Minden TODO pont részletes elemzése, indoklása, és összefüggéseinek feltárása

---

## 🎯 DOKUMENTUM CÉLJA

Ez a dokumentum nem egyszerű feladatlista. Minden ponthoz:
- Megvizsgáljuk a lehetséges megoldásokat
- Kiválasztjuk a legjobbat és megindokoljuk
- Leírjuk közérthetően mit változtat
- Feltárjuk a kapcsolatokat más pontokkal
- Feltesszük azokat a kérdéseket is, amiket egy fejlesztő feltenne

---

## 📐 ALKALMAZOTT MODERN ELVEK

A döntéseknél ezeket a szempontokat vesszük figyelembe:

| Elv | Mit jelent neked |
|-----|------------------|
| **Modular Monolith** | Egy alkalmazás, de belül tisztán elkülönített részek |
| **Vertical Slice** | Minden funkció önálló "szelet" (UI + API + DB együtt) |
| **Cognitive Load Budgeting** | A kód ne legyen bonyolultabb mint amennyit egy ember átlát |
| **Zero-Noise Interface** | Csak az látszik ami fontos, semmi felesleg |
| **KPI-First Dashboard** | A vezető azonnal lássa a lényeget |
| **Schema-Driven Forms** | A form mezők adatbázisból jönnek, nem kódból |
| **Telemetry-First** | Minden fontos esemény naplózva, mérhető |

---

# 🔴 KRITIKUS PRIORITÁS

## K1. BCRYPT DUPLIKÁCIÓ MEGSZÜNTETÉSE

### A probléma közérthetően
Jelenleg KÉT jelszó-titkosító könyvtár van telepítve (`bcrypt` és `bcryptjs`). Ez olyan mintha két különböző zárat tennél ugyanarra az ajtóra - felesleges, zavaró, és biztonsági kockázat.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Marad `bcrypt` | Gyorsabb (natív C++) | Windows-on néha telepítési gond |
| B) Marad `bcryptjs` | Tiszta JavaScript, mindenhol fut | Kicsit lassabb |
| C) Mindkettő marad | Semmi | Duplikáció, zavar, nagyobb app |

### Döntés: **A) bcrypt marad**
**Indoklás:** 
- A TDK szerveren Node.js fut, nem böngésző
- A natív `bcrypt` 3-4x gyorsabb 
- A telepítési problémák csak fejlesztői gépen jelentkeznek, production-ben nem

### Mit változtat
- Kisebb alkalmazás méret (~50KB megtakarítás)
- Egy helyen van a jelszó kezelés
- Új fejlesztő nem zavarodik össze ("melyiket használjam?")

### Érintett fájlok
- `package.json` - bcryptjs törlése
- `lib/auth.ts` - ellenőrizni hogy bcrypt-et használ
- `app/api/admin/users/route.ts` - ellenőrizni
- `app/api/admin/verify/route.ts` - ellenőrizni

### Kockázat
🟢 ALACSONY - Egyszerű csere, könnyen tesztelhető (bejelentkezés működik-e)

### Kapcsolódó pontok
- K2 (Plain text jelszavak) - ugyanaz a terület

---

## K2. PLAIN TEXT JELSZAVAK TILTÁSA

### A probléma közérthetően
Jelenleg a rendszer elfogad "sima" jelszavakat is (nem titkosított). Ez fejlesztéskor kényelmes ("admin" jelszóval belépek), de VESZÉLYES ha valaki elfelejti titkosítani egy új felhasználó jelszavát.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Production-ben tiltás | Biztonságos, dev marad kényelmes | Kétféle viselkedés |
| B) Mindenhol tiltás | Egységes, biztonságos | Dev-ben kényelmetlen |
| C) Automatikus hash-elés | Mindkét világ legjava | Bonyolultabb logika |

### Döntés: **C) Automatikus hash-elés**
**Indoklás:** 
- Ha valaki plain text jelszót ad meg, a rendszer automatikusan titkosítja
- Nincs "elfelejtés" kockázat
- Development is production-szerűen működik (nincs meglepetés élesítéskor)

### Mit változtat
- Lehetetlen plain text jelszót tárolni
- Fejlesztőnek sem kell hash-elni kézzel
- Audit-on átmegy (biztonsági ellenőrzés)

### Új AI kérdés amit te nem tennél fel
> "Mi van a meglévő plain text jelszavakkal az adatbázisban?"

**Válasz:** Migration script kell ami:
1. Megkeresi a nem hash-elt jelszavakat (nem `$2a$` vagy `$2b$` kezdetű)
2. Hash-eli őket
3. Logolja hány rekordot módosított

### Kockázat
🟡 KÖZEPES - Alapos tesztelés kell (minden user be tud-e lépni)

### Kapcsolódó pontok
- K1 (bcrypt) - előbb az legyen kész
- F3 (RBAC) - mindkettő biztonsági terület

---

## K3. TELJESÍTMÉNY OLDAL DARABOLÁSA

### A probléma közérthetően
A `teljesitmeny/page.tsx` fájl **1309 sor**. Ez olyan mintha egy 50 oldalas dokumentumot egyetlen bekezdésbe írnál. Senki nem fogja átlátni, a hibakeresés rémálom, és az AI is nehezebben segít.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Komponensekre bontás | Átlátható, újrahasználható | Refaktor munka |
| B) Több oldalra bontás | Teljesen elkülönül | URL változik, bonyolultabb navigáció |
| C) Marad így | Semmi munka | Egyre rosszabb lesz |

### Döntés: **A) Komponensekre bontás**
**Indoklás:**
- A "Vertical Slice" elv: minden funkció önálló komponens
- A "Cognitive Load Budgeting": max 200-300 sor/fájl, amit egy ember átlát
- Újrahasználhatóság (pl. `MuszakSelector` más oldalon is kell)

### Javasolt struktúra

```
components/teljesitmeny/
├── TeljesitmenyChart.tsx      # Grafikon komponens
├── MuszakSelector.tsx         # Műszak választó (A/B/C/SUM)
├── PeriodNavigator.tsx        # Időszak navigáció (előző/következő)
├── EgyeniRanglista.tsx        # Operátor ranglista
├── EgyeniTrend.tsx            # Egy operátor trendje
├── ImportStatus.tsx           # Import státusz kijelző
└── types.ts                   # Típusok egy helyen

hooks/
├── useTeljesitmenyData.ts     # Produktív adatok lekérése
└── useEgyeniData.ts           # Egyéni adatok lekérése
```

### Mit változtat
- 1309 sor → 6-8 fájl × 150-200 sor
- Új fejlesztő 5 perc alatt átlátja
- AI könnyebben segít (kisebb kontextus)
- Bug? Tudod melyik komponensben keresned

### Modern elv alkalmazása
**"Information Density Control"** - Minden komponens egy dologért felel, és azt jól csinálja.

### Kockázat
🟡 KÖZEPES - Sok fájl módosul, de a funkció nem változik

### Kapcsolódó pontok
- K5 (Létszám darabolás) - ugyanez a minta
- F4 (Service layer) - az üzleti logika is külön megy

---

## K4. DOKUMENTÁCIÓ KONSZOLIDÁLÁS

### A probléma közérthetően
3 különböző setup fájl van a gyökérben (`SETUP_GUIDE.md`, `DATABASE_SETUP.md`, `SETUP_COMPLETE.md`). Új ember nem tudja melyiket olvassa. A `README.md` meg az alap Next.js szöveg, semmi hasznos.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Egy SETUP.md a docs/ mappába | Tiszta, egy igazság | A régiek törlése |
| B) README.md-be minden | Hagyományos hely | Túl hosszú lesz |
| C) Külső wiki | Szép felület | Szinkron probléma |

### Döntés: **A) + README.md frissítés**
**Indoklás:**
- `docs/SETUP.md` - részletes telepítési útmutató
- `README.md` - projekt összefoglaló + link a docs/-ra
- Gyökér tiszta marad

### Javasolt README.md struktúra

```markdown
# AINOVA - Termelésirányító Rendszer

## Mi ez?
Létszám, teljesítmény és termelési adatok kezelése.

## Gyors indítás
npm install → npm run dev → localhost:3000

## Dokumentáció
- [Telepítés](docs/SETUP.md)
- [Modulok](docs/MODULES.md)
- [Fejlesztési terv](docs/TODO_RESZLETES.md)

## Technológiák
Next.js 16, SQL Server, TypeScript, Tailwind
```

### Mit változtat
- Új ember 30 másodperc alatt tudja mit csináljon
- Nincs "melyik fájlt olvassam" kérdés
- `docs/` mappa = minden dokumentáció

### Kockázat
🟢 ALACSONY - Csak fájl mozgatás/törlés

---

## K5. FELESLEGES FÁJLOK TÖRLÉSE

### A probléma közérthetően
Debug fájlok, duplikált scriptek, teszt adatok vannak a repóban. Ezek:
- Növelik a méretet
- Zavarják az átlátást
- Biztonsági kockázat (debug fájlokban lehet érzékeny adat)

### Törölendő fájlok listája

| Fájl | Miért törölhető |
|------|-----------------|
| `PEMC-debug.xlsm` | Debug fájl, nem kell verziókezelésben |
| `scripts/002_users_and_shifts.sql` | Van FINAL verzió |
| `scripts/db-schema.sql` | Elavult, más struktúra |
| `scripts/mock-data.sql` | Teszt adat |
| `scripts/dummy-teljesitmeny.sql` | Teszt adat |
| `scripts/letszam-dummy-data.sql` | Teszt adat |
| `scripts/torol-mock-adatok.sql` | Ha nincs mock, ez sem kell |
| `SETUP_GUIDE.md` | → docs/SETUP.md |
| `DATABASE_SETUP.md` | → docs/SETUP.md |
| `SETUP_COMPLETE.md` | → docs/SETUP.md |

### .gitignore bővítése

```gitignore
# Debug fájlok
*.xlsm
*-debug.*

# Teszt adatok
*dummy*.sql
*mock*.sql
```

### Kockázat
🟢 ALACSONY - De ELŐTTE ellenőrizni, hogy a script-ek közül melyik kell még

---

# 🟡 FONTOS PRIORITÁS

## F1. ADMIN SETTINGS MODUL

### A probléma közérthetően
Jelenleg a beállítások "bele vannak égetve" a kódba. Ha változtatni akarsz (pl. session timeout 24h helyett 8h), akkor:
1. Meg kell keresni a kódban
2. Módosítani
3. Újra kell buildelni
4. Újra kell deployolni

Ez nem menedzseri megoldás. A menedzser azt akarja, hogy egy felületen átállítsa.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Adatbázis tábla + Admin UI | Azonnal állítható | Fejlesztés kell |
| B) Környezeti változók (.env) | Egyszerű | Újraindítás kell |
| C) Konfig fájl (JSON) | Középút | Fájlszerkesztés kell |

### Döntés: **A) Adatbázis + Admin UI**
**Indoklás:**
- **"Zero-Training UX"** elv: a menedzser ne tanuljon új dolgot
- **"At-a-Glance UX"**: egy helyen minden beállítás
- Azonnal él a változás, nincs újraindítás
- Audit: ki mikor mit állított (naplózható)

### Javasolt beállítások

| Beállítás | Típus | Jelenlegi | Leírás |
|-----------|-------|-----------|--------|
| `session_timeout_hours` | Szám | 24 | Munkamenet lejárat |
| `rate_limit_attempts` | Szám | 5 | Max hibás bejelentkezés |
| `rate_limit_window_min` | Szám | 15 | Blokkolás időablak |
| `daily_target_minutes` | Szám | 480 | Napi cél perc (100%) |
| `min_valid_daily_minutes` | Szám | 1000 | Min érvényes nap |
| `maintenance_mode` | Bool | false | Karbantartás mód |
| `excel_teljesitmeny_path` | Szöveg | ... | Excel útvonal |
| `excel_napi_perces_path` | Szöveg | ... | Excel útvonal |

### Modern elv alkalmazása
**"Schema-Driven Forms"** - A beállítások szerkezete adatbázisból jön:
- Új beállítás = új sor a táblában
- Nem kell kódot módosítani
- A form automatikusan rendereli

### Mit változtat
- Menedzser maga állítja a rendszert
- Nem kell fejlesztőt hívni apróságokhoz
- Minden változás naplózva
- Nincs "hol is van ez a kódban?" kérdés

### Kockázat
🟡 KÖZEPES - Új funkció, de nem érinti a meglévőket

### Kapcsolódó pontok
- F2 (Pozíciók admin) - hasonló elv
- F4 (Service layer) - a beállításokat service kezeli

---

## F2. POZÍCIÓK ADMIN KEZELÉSE

### A probléma közérthetően
A pozíciók (Előkészítő, Tekercselő, stb.) HÁROM helyen vannak definiálva:
1. SQL tábla constraint-ben
2. Frontend kódban (hard-coded lista)
3. Backend kódban (hard-coded lista)

Ha új pozíciót akarsz:
1. SQL módosítás
2. Frontend módosítás
3. Backend módosítás
4. Build + deploy

Ez nem fenntartható.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Adatbázis tábla + Admin UI | Egy helyen, dinamikus | Fejlesztés kell |
| B) Csak SQL-ben | Elég egy helyen | Nincs szép UI |
| C) Config fájl | Egyszerű | Szinkron probléma |

### Döntés: **A) Adatbázis tábla + Admin UI**
**Indoklás:**
- **"Single Source of Truth"** - Egy helyen van az igazság
- Frontend és backend ugyanazt az API-t hívja
- Menedzser hozzáadhat új pozíciót
- Megjelölheti melyik "kritikus"

### Javasolt pozíció tábla

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | INT | Azonosító |
| `nev` | NVARCHAR | Pozíció neve |
| `tipus` | NVARCHAR | 'operativ' vagy 'nem_operativ' |
| `is_kritikus` | BIT | Kritikus pozíció? |
| `sorrend` | INT | Megjelenési sorrend |
| `aktiv` | BIT | Használatban? |

### AI kérdés amit te nem tennél fel
> "Mi van ha egy pozíciót törölni akarnak, de van hozzá adat?"

**Válasz:** Soft delete! Az `aktiv` mező 0-ra állítása. Így:
- Új rögzítésnél nem választható
- Régi adatok megmaradnak
- Visszaállítható ha tévedés volt

### Mit változtat
- Új pozíció = 1 perc az admin felületen
- Nem kell fejlesztő
- Kritikus pozíciók jelölése egyszerű

### Kockázat
🟡 KÖZEPES - Minden pozíció-referenciát át kell írni DB hívásra

### Kapcsolódó pontok
- F1 (Settings) - hasonló minta
- K3 (Létszám) - ez használja a pozíciókat

---

## F3. RBAC MIDDLEWARE (Jogosultságkezelés)

### A probléma közérthetően
Jelenleg MINDEN API végpont maga ellenőrzi a jogosultságot:
```
if (session.role !== 'Admin') return 403
```

Ez:
- Ismétlődő kód
- Könnyen kifelejthető
- Nehéz áttekinteni ki mihez fér hozzá

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Központi middleware | Egy helyen, átlátható | Refaktor |
| B) Decorator pattern | Szép szintaxis | TypeScript korlátok |
| C) Marad így | Semmi munka | Egyre rosszabb |

### Döntés: **A) Központi middleware**
**Indoklás:**
- **"Policy-as-Code"** elv: a jogosultságok egy helyen vannak
- Könnyen bővíthető
- Audit: látod ki mihez fér hozzá

### Javasolt jogosultsági mátrix

| Endpoint | Admin | Manager | Műszakvezető | Operátor |
|----------|-------|---------|--------------|----------|
| GET /api/letszam | ✅ | ✅ | ✅ | ❌ |
| POST /api/letszam | ✅ | ✅ | ✅ | ❌ |
| GET /api/admin/users | ✅ | ✅ | ❌ | ❌ |
| POST /api/admin/users | ✅ | ❌ | ❌ | ❌ |
| DELETE /api/admin/users | ✅ | ❌ | ❌ | ❌ |
| GET /api/admin/settings | ✅ | ❌ | ❌ | ❌ |

### Mit változtat
- Egy helyen látod az összes jogosultságot
- Új endpoint = hozzáadod a mátrixhoz
- Nem felejtheted ki az ellenőrzést

### Modern elv alkalmazása
**"Authorization Graph"** - Hosszú távon a jogosultságok gráf struktúrában:
- User → Role → Permission → Resource
- De most elég a Role → Endpoint mátrix

### Kockázat
🟡 KÖZEPES - Minden API route módosul

---

## F4. SERVICE LAYER BEVEZETÉSE

### A probléma közérthetően
Jelenleg az API route-ok MINDENT csinálnak:
- Input validálás
- Adatbázis hívás
- Üzleti logika
- Válasz formázás

Ez túl sok felelősség. Ha ugyanazt az üzleti logikát máshol is akarod használni (pl. scheduled job), copy-paste kell.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Service osztályok | Tiszta szétválasztás | Több fájl |
| B) Helper függvények | Egyszerűbb | Kevésbé strukturált |
| C) Marad így | Semmi munka | Duplikálódik a logika |

### Döntés: **A) Service osztályok**
**Indoklás:**
- **"Vertical Slice"** de közös mag: a service a közös
- Tesztelhető (mock-olható DB nélkül)
- Újrahasználható (API, cron job, CLI mind hívhatja)

### Javasolt struktúra

```
lib/services/
├── auth.service.ts        # Login, logout, session
├── user.service.ts        # CRUD, keresés, szűrés
├── teljesitmeny.service.ts # Kimutatások, számítások
├── letszam.service.ts     # Rögzítés, audit
├── import.service.ts      # Excel beolvasás
└── settings.service.ts    # Beállítások kezelése
```

### Mit változtat az API route-ban

**ELŐTTE (rossz):**
```
Route: Validálás + DB + Logika + Response = 200 sor
```

**UTÁNA (jó):**
```
Route: Validálás + Service hívás + Response = 30 sor
Service: DB + Logika = 150 sor (de újrahasználható)
```

### Mit változtat
- API route-ok rövidek és áttekinthetőek
- Üzleti logika tesztelhető
- Scheduled job is használhatja ugyanazt a service-t
- Új fejlesztő gyorsan átlátja

### Kockázat
🟡 KÖZEPES - Nagy refaktor, de lépésenként végezhető

### Kapcsolódó pontok
- K3 (Komponens darabolás) - frontend párja ennek
- F3 (RBAC) - a middleware a service előtt fut

---

## F5. LÉTSZÁM OLDAL REFAKTORÁLÁS

### A probléma közérthetően
Ugyanaz mint K3, de a létszám oldalra: **796 sor** egy fájlban.

### Döntés
Ugyanaz a minta mint K3:
- Komponensekre bontás
- Custom hook az adatoknak
- Max 200-300 sor/fájl

### Javasolt struktúra

```
components/letszam/
├── LetszamForm.tsx        # A fő form
├── LetszamTable.tsx       # Már létezik, jó
├── LetszamSummary.tsx     # Összesítő
├── ShiftSelector.tsx      # Műszak választó
├── DateSelector.tsx       # Már létezik, jó
├── RiportKotelesModal.tsx # Már létezik, jó
└── OverwriteConfirm.tsx   # Felülírás megerősítés

hooks/
└── useLetszamData.ts      # Adatok kezelése
```

### Kockázat
🟡 KÖZEPES - Sok fájl, de a K3 után már rutin

---

# 🟢 KÖZEPES PRIORITÁS

## M1. REACT QUERY BEVEZETÉSE

### A probléma közérthetően
Jelenleg minden oldal maga kezeli:
- Betöltés állapot (`loading: true/false`)
- Hiba kezelés (`error: string | null`)
- Adat cache (nincs, minden navigációnál újratölt)
- Újratöltés (kézi)

Ez rengeteg ismétlődő kód és rossz felhasználói élmény (minden kattintásnál tölt).

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) React Query | Iparági standard, cache, auto-refetch | Új library tanulás |
| B) SWR | Könnyebb, Vercel | Kevesebb feature |
| C) Marad így | Semmi munka | Rossz UX, sok boilerplate |

### Döntés: **A) React Query**
**Indoklás:**
- **"Stale-While-Revalidate"** - Régi adatot mutat amíg frissít (gyors UX)
- Automatikus újratöltés (tab focus, interval)
- Retry hibánál
- Cache megosztás komponensek között

### Mit változtat a felhasználónak
- Gyorsabb oldal váltás (cache-ből jön)
- Nincs "üres oldal töltés közben"
- Automatikusan frissül ha visszajön az oldalra

### Mit változtat a kódban
- Nincs `useState(loading)`, `useState(error)` minden oldalon
- Nincs `useEffect` fetch-hez
- Egy hook = adat + loading + error + refetch

### Kockázat
🟢 ALACSONY - Fokozatosan bevezethető oldalonként

---

## M2. EGYSÉGTESZTEK

### A probléma közérthetően
Nincs automatikus teszt. Minden módosításnál kézzel kell ellenőrizni:
- Működik-e a login?
- Működik-e a létszám mentés?
- stb.

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Jest | Népszerű, jó Next.js támogatás | Konfigurálás |
| B) Vitest | Gyors, modern | Újabb, kevesebb docs |
| C) Nincs teszt | Gyors fejlesztés | Kockázatos módosítások |

### Döntés: **B) Vitest**
**Indoklás:**
- Gyorsabb mint Jest
- Natív ESM támogatás
- A TypeScript konfig újrahasználható

### Mit teszteljünk először

| Prioritás | Mit | Miért |
|-----------|-----|-------|
| 1 | Validátorok | Egyszerű, sok helyen használt |
| 2 | Auth logika | Kritikus, biztonsági |
| 3 | Service-ek | Üzleti logika |

### Mit változtat
- Módosítás után pár másodperc alatt tudod működik-e
- Új fejlesztő bátran módosíthat (teszt elkapja a hibát)
- CI-ban automatikusan fut

### Kockázat
🟢 ALACSONY - Fokozatosan építhető

---

## M3. REDIS CACHE

### A probléma közérthetően
A session cache és rate limiting jelenleg **memóriában** van. Ha:
- Újraindul a szerver → mindenki kijelentkezik
- Több szerver van → nem szinkronizálnak

### Lehetséges megoldások

| Megoldás | Előny | Hátrány |
|----------|-------|---------|
| A) Redis | Gyors, skálázható, iparági standard | Külső szolgáltatás |
| B) SQL táblában | Már van DB | Lassabb |
| C) Marad memória | Egyszerű | Nem skálázódik |

### Döntés: **A) Redis, de fallback memóriára**
**Indoklás:**
- Production-ben Redis (megbízható)
- Development-ben memória (egyszerű, nincs dependency)
- Feature flag kapcsolja

### Mikor kell ez valójában?
**MOST NEM KRITIKUS** mert:
- Egy szerver van
- Nem gyakori az újraindítás
- De ha skálázni kell, akkor már legyen kész

### Kockázat
🟢 ALACSONY - Fallback mindig működik

---

# 🔗 ÖSSZEFÜGGÉSEK ÉS SORREND

## Függőségi gráf

```
K1 (bcrypt) ─────► K2 (plain text)
                        │
K4 (doksik) ────────────┼────► KÉSZ a tiszta alap
                        │
K5 (törlés) ────────────┘

K3 (teljesítmény) ──┬──► F4 (service layer)
                    │
K5 (létszám) ───────┘
                    │
                    ▼
              F1 (settings) ──► F2 (pozíciók)
                    │
                    ▼
              F3 (RBAC) ──► Minden API biztonságos
                    │
                    ▼
              M1 (React Query) ──► M2 (tesztek)
                    │
                    ▼
              M3 (Redis) ──► Skálázható
```

## Ajánlott végrehajtási sorrend

| Fázis | Feladatok | Időigény | Eredmény |
|-------|-----------|----------|----------|
| **1** | K1, K4, K5 | 2 óra | Tiszta repo |
| **2** | K2 | 1 óra | Biztonságos jelszavak |
| **3** | K3, F5 | 4-6 óra | Átlátható komponensek |
| **4** | F4 | 4-6 óra | Service layer |
| **5** | F1, F2 | 6-8 óra | Admin beállítások |
| **6** | F3 | 2-3 óra | RBAC |
| **7** | M1, M2 | 4-6 óra | Tesztek, jobb UX |
| **8** | M3 | 2-3 óra | Skálázhatóság |

---

# ❓ AI KÉRDÉSEK AMIKET TE NEM TENNÉL FEL

## Architektúra

> **"Modular Monolith vs Microservices - melyik kell nekünk?"**

**Válasz:** Modular Monolith. Mert:
- Egy csapat, egy deploy, egyszerű
- De belül tisztán elkülönített modulok
- Ha KELL microservice, könnyű kivágni egy modult
- AINOVA méretéhez microservice overkill lenne

---

> **"Mi az Evolutionary Architecture és kell-e?"**

**Válasz:** Igen, de már csináljuk! Ez azt jelenti:
- A rendszer úgy épül, hogy KÖNNYŰ változtatni
- Nem próbáljuk megjósolni a jövőt
- Inkább: könnyen módosítható struktúra

A komponens darabolás, service layer, admin settings → mind ezt szolgálja.

---

## Biztonság

> **"Zero Trust - mi ez és kell-e?"**

**Válasz:** A "senkiben nem bízunk" elv:
- Minden kérést ellenőrzünk (middleware - MEGVAN)
- Session-t validáljuk (MEGVAN)
- Rate limiting (MEGVAN)
- RBAC (TODO)

Alapvetően jó úton vagyunk.

---

> **"Mi van ha valaki ellopja a session cookie-t?"**

**Válasz:** Jelenlegi védelmek:
- HTTP-only cookie (JavaScript nem éri el) ✅
- 24 óra lejárat ✅
- IP-hez kötés (NINCS - lehetne TODO)
- Fingerprint (NINCS - advanced, nem kritikus)

---

## Teljesítmény

> **"Kell-e Connection Pooling optimalizálás?"**

**Válasz:** Van már pool (2-10 connection). Figyelni kell:
- Ha lassú a DB → növelni a pool-t
- Ha sok a timeout → health check bevezetése
- Most OK, de monitoring kellene

---

> **"Mi az OLTP/OLAP Convergence és kell-e?"**

**Válasz:** Az AINOVA OLTP (tranzakciós) és OLAP (analitikus) is:
- Létszám mentés = OLTP
- Teljesítmény kimutatás = OLAP

Jelenleg EGY adatbázis mind a kettőre. Ez OK amíg:
- Nincs nagy adatmennyiség
- A riportok nem lassítják a mentést

Ha lassul → Materialized View-k vagy külön OLAP (pl. ClickHouse). De most nem prioritás.

---

## UX / Menedzseri

> **"Kell-e Executive Dashboard?"**

**Válasz:** IGEN! A menedzser azt akarja:
- 1 képernyő = összes KPI
- Piros-Sárga-Zöld jelzés
- Drill-down ha kell részlet
- Zero-click: betöltéskor minden ott van

A jelenlegi dashboard jó alap, de lehetne:
- KPI Tiles a tetején (mai létszám, tegnapi teljesítmény, trend)
- RAG státusz (piros ha baj van)
- Sparkline mini grafikonok

Ez egy FUTURE TODO, nem kritikus most.

---

> **"Mi az a Calm Technology?"**

**Válasz:** A rendszer NE stresszeljen:
- Ne villogjon feleslegesen
- Ne legyen túl sok notification
- A fontos dolgok kiemelve, a többi háttérben
- A menedzser TUDJA hogy minden OK anélkül hogy bármit csinálna

A jelenlegi design jó úton van (egyszerű, tiszta).

---

## Fejlesztési folyamat

> **"Kell-e Spec-to-Code (AI generálja a kódot specifikációból)?"**

**Válasz:** Részben már csináljuk! Amikor leírod mit akarsz, én generálom. De formalizálható:
- Markdown spec → AI → kód
- Type definition → AI → implementáció

Nem prioritás, de érdekes irány.

---

> **"Mi az Autonomous Refactoring?"**

**Válasz:** AI automatikusan refaktorál:
- Felismeri a code smell-eket
- Javasol javítást
- Vagy automatikusan javít (review-val)

Most is csinálom, de lehetne rendszeresebb (pl. heti "code review" session).

---

# 📊 ÖSSZEFOGLALÓ TÁBLÁZAT

| Pont | Mit változtat | Kockázat | Időigény | Függőség |
|------|---------------|----------|----------|----------|
| K1 | Egy bcrypt lib | 🟢 | 30 perc | - |
| K2 | Biztonságos jelszavak | 🟡 | 1 óra | K1 |
| K3 | Átlátható teljesítmény oldal | 🟡 | 4 óra | - |
| K4 | Rendezett dokumentáció | 🟢 | 1 óra | - |
| K5 | Tiszta repo | 🟢 | 30 perc | - |
| F1 | Admin beállítások | 🟡 | 4 óra | - |
| F2 | Pozíciók adminból | 🟡 | 3 óra | F1 |
| F3 | Jogosultság egy helyen | 🟡 | 3 óra | F4 |
| F4 | Újrahasználható logika | 🟡 | 6 óra | K3 |
| F5 | Átlátható létszám oldal | 🟡 | 3 óra | K3 után rutin |
| M1 | Gyorsabb UX, kevesebb kód | 🟢 | 4 óra | - |
| M2 | Biztonságos módosítás | 🟢 | 4 óra | F4 |
| M3 | Skálázhatóság | 🟢 | 2 óra | - |

---

# ✅ ÚJ SESSION ÚTMUTATÓ AI-NAK

Ha új AI session-ben folytatod a munkát, add meg neki ezt:

```
Ez az AINOVA projekt. Olvasd el:
1. docs/PROJEKT_AUDIT.md - Projekt állapot és értékelés
2. docs/TODO_RESZLETES.md - Részletes feladatok és döntések
3. docs/MODULES.md - Modulok működése
4. docs/MILESTONES.md - Verzió terv

Célok:
- Minden kód 5 csillagos minőség
- Modular Monolith architektúra
- Max 300 sor/fájl
- Service layer az üzleti logikának
- Admin-ból állítható beállítások
- Zero-noise, KPI-first UX
```

---

*Dokumentum vége. Utoljára frissítve: 2026. január 8.*
