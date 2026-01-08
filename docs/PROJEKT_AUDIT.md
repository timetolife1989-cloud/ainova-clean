# 🔍 AINOVA Projekt Audit

**Készült:** 2026. január 7.  
**Verzió:** 1.0.0

---

## 📊 ÖSSZEFOGLALÓ

### Projekt Értékelés

| Kategória | Értékelés | Megjegyzés |
|-----------|-----------|------------|
| **Biztonság** | ⭐⭐⭐⭐☆ (4/5) | Jó alapok, néhány javítandó |
| **Karbantarthatóság** | ⭐⭐⭐☆☆ (3/5) | Duplikált kód, hiányzó abstrakciók |
| **Átláthatóság** | ⭐⭐⭐⭐☆ (4/5) | Jó kommentek, de szétszórt |
| **Teljesítmény** | ⭐⭐⭐⭐☆ (4/5) | Caching működik, optimalizálható |
| **Skálázhatóság** | ⭐⭐⭐☆☆ (3/5) | Single-instance korlátok |

---

## 🏗️ 1. RÉTEG: CORE INFRASTRUKTÚRA

### 1.1 Adatbázis kapcsolat (lib/db.ts)
**Értékelés: ⭐⭐⭐⭐⭐ KIVÁLÓ**

✅ **Erősségek:**
- Singleton pattern helyesen implementálva
- Graceful shutdown kezelés (SIGINT, SIGTERM, beforeExit)
- Connection pool leak védelem
- Környezeti változó validáció
- Timeout védelem az újracsatlakozásnál

⚠️ **Javítandó:**
- Nincs connection health check (periodikus ping)
- Nincs automatic reconnection logic
- A pool méret fix (nem dinamikus)

### 1.2 Autentikáció (lib/auth.ts)
**Értékelés: ⭐⭐⭐⭐☆ JÓ**

✅ **Erősségek:**
- Bcrypt hash támogatás (12 rounds)
- Session cache (5 perces TTL) - csökkenti DB terhelést
- Rate limiting (5 próbálkozás/15 perc)
- Fallback in-memory rate limiting ha DB nem elérhető
- Audit logging (non-blocking)
- Feature flag-ek (`FE_LOGIN_RATE_LIMIT`, `FE_LOGIN_AUDIT`)
- Részletes hálózati hibakezelés

⚠️ **Javítandó:**
- Plain text jelszavak még támogatottak (biztonsági kockázat)
- In-memory rate limit nem szinkronizált több szerver között
- Session expiry fix 24 óra (nincs "Remember me" opció)
- `BCRYPT_ROUNDS` konstans definiálva constants.ts-ben, de nincs használva

❌ **Kritikus hibák:**
- `bcrypt` és `bcryptjs` is telepítve - DUPLIKÁCIÓ!
- Különböző fájlok különböző könyvtárat használnak

### 1.3 Middleware (middleware.ts)
**Értékelés: ⭐⭐⭐⭐☆ JÓ**

✅ **Erősségek:**
- Edge Runtime kompatibilis (fetch API)
- User context továbbítása header-ekben
- Különböző fail-safe policy dev vs prod között

⚠️ **Javítandó:**
- Funkció neve `proxy` - de `middleware` is exportálva - zavaró
- `PUBLIC_ROUTES` és `PUBLIC_PREFIXES` hard-coded - adminból kellene

### 1.4 Konstansok és típusok
**Értékelés: ⭐⭐⭐☆☆ KÖZEPES**

✅ **Erősségek:**
- Központosított konstansok (`lib/constants.ts`)
- Típusdefiníciók külön fájlban (`lib/types/admin.ts`)
- Validátorok újrafelhasználhatók (`lib/validators/user.ts`)

⚠️ **Javítandó:**
- `BCRYPT_ROUNDS` nincs definiálva (de hivatkoznak rá)
- Pozíció lista eltér a kódban és az SQL constraint-ben
- Műszak konstansok duplikálva több helyen

---

## 📦 2. RÉTEG: API ROUTE-OK

### 2.1 Auth API-k
**Értékelés: ⭐⭐⭐⭐⭐ KIVÁLÓ**

✅ **Erősségek:**
- Részletes input validáció
- DoS védelem (hossz limitek)
- Proper error handling
- HTTP-only cookie beállítás

### 2.2 Admin API-k (users, verify)
**Értékelés: ⭐⭐⭐⭐☆ JÓ**

✅ **Erősségek:**
- Duplikáció ellenőrzés (username, email)
- Bcrypt hash használat
- Soft delete támogatás
- CASCADE update törzsszámra
- Utolsó admin védelem

⚠️ **Javítandó:**
- Validáció részben duplikált (route-ban is, validators-ben is)
- Nincs role-based access control (RBAC) middleware
- Admin verify API-ban is duplikált jelszó összehasonlítás

### 2.3 Létszám API
**Értékelés: ⭐⭐⭐☆☆ KÖZEPES**

✅ **Erősségek:**
- Tranzakció kezelés
- Audit log minden változásról
- Riport köteles módosítások naplózása

⚠️ **Javítandó:**
- Pozíciók hard-coded a route-ban - nincs szinkronban a DB-vel
- Kritikus pozíciók is hard-coded
- Pool kezelés redundáns (`let pool: sql.ConnectionPool | null = null`)

### 2.4 Teljesítmény API-k
**Értékelés: ⭐⭐⭐⭐☆ JÓ**

✅ **Erősségek:**
- Komplex SQL lekérdezések CTÉ-vel
- Szűrési szabályok (mai nap kihagyása, min percek)
- Trend számítás

⚠️ **Javítandó:**
- 500+ soros fájl - túl nagy, darabolni kellene
- Hasonló CTE logika ismétlődik (DRY probléma)
- Magic number-ek a kódban (pl. 7, 14, 30 napok)

### 2.5 Napi Perces API
**Értékelés: ⭐⭐⭐☆☆ KÖZEPES**

✅ **Erősségek:**
- Auto-import funkció
- Import lock védelem

⚠️ **Javítandó:**
- Excel path hard-coded
- Hónap nevek magyar és angol keveréke
- Túl komplex egy fájlban

---

## 🖥️ 3. RÉTEG: FRONTEND KOMPONENSEK

### 3.1 Dashboard oldalak
**Értékelés: ⭐⭐⭐☆☆ KÖZEPES**

⚠️ **Javítandó:**
- `teljesitmeny/page.tsx` = 1309 sor! TÚLZOTTAN NAGY
- `letszam/page.tsx` = 796 sor! NAGY
- Pozíciók és műszakok hard-coded frontenden is
- State kezelés kaotikus - nincs React Context

### 3.2 UI Komponensek
**Értékelés: ⭐⭐⭐⭐☆ JÓ**

✅ **Erősségek:**
- AinovaLoader egységes
- Framer Motion animációk
- Tailwind osztályok következetesek

⚠️ **Javítandó:**
- Form validáció duplikálva (frontend + backend)
- Nincs form könyvtár (react-hook-form ajánlott)

---

## 🗑️ 4. MARADVÁNYFÁJLOK ÉS HALOTT KÓD

### 4.1 Törölhető fájlok

| Fájl | Ok |
|------|-----|
| `PEMC-debug.xlsm` | Debug Excel - nem kellene verziókezelésben |
| `README.md` | Alap Next.js README - nincs testreszabva |
| `SETUP_GUIDE.md` | Elavult - SETUP_COMPLETE-tel átfed |
| `DATABASE_SETUP.md` | Elavult - SETUP_COMPLETE-tel átfed |
| `scripts/db-schema.sql` | Elavult - más struktúra mint ami van |
| `scripts/002_users_and_shifts.sql` | Van FINAL verzió |
| `scripts/mock-data.sql` | Teszt adat - nem production |
| `scripts/dummy-teljesitmeny.sql` | Teszt adat |
| `scripts/letszam-dummy-data.sql` | Teszt adat |
| `scripts/torol-mock-adatok.sql` | Ha nincs mock, ez sem kell |

### 4.2 Duplikált fájlok

| Fájlok | Probléma |
|--------|----------|
| `bcrypt` + `bcryptjs` | Két bcrypt könyvtár! |
| `002_users_and_shifts.sql` + `FINAL` verzió | Duplikáció |

### 4.3 Megtartandó de konszolidálandó

| Fájlok | Javaslat |
|--------|----------|
| `SETUP_GUIDE.md`, `DATABASE_SETUP.md`, `SETUP_COMPLETE.md` | Egyesíteni → `docs/SETUP.md` |
| SQL scriptek | Rendezni verzió szerint: `migrations/` mappa |

---

## 🔐 5. BIZTONSÁGI AUDIT

### 5.1 Kritikus problémák

| Probléma | Súlyosság | Megoldás |
|----------|-----------|----------|
| Plain text jelszavak támogatottak | 🔴 MAGAS | Tiltani production-ben |
| bcryptjs vs bcrypt keveredés | 🟡 KÖZEPES | Egységesíteni bcrypt-re |
| sessionStorage admin verify | 🟡 KÖZEPES | Rövid timeout + re-auth |
| Nincs RBAC middleware | 🟡 KÖZEPES | Központi jogosultság ellenőrzés |
| Excel path környezeti változóból | 🟢 ALACSONY | Már constants-ban, de .env-be |

### 5.2 Biztonsági javaslatok

1. **CSP (Content Security Policy)** hozzáadása
2. **Rate limiting** Redis-alapúra cserélni (skálázhatóság)
3. **Audit log** külön táblába (LoginHistory bővítése)
4. **Password policy** erősítése (special karakterek)
5. **Session invalidation** role változásnál (már van, de tesztelni)

---

## 🚀 6. TELJESÍTMÉNY OPTIMALIZÁLÁS

### 6.1 Jelenlegi optimalizációk

✅ Session cache (5 perc)
✅ Connection pool (2-10 connection)
✅ SQL indexek a fő táblákon
✅ Persisted computed column (százalék)

### 6.2 Javasolt optimalizációk

| Terület | Jelenlegi | Javasolt |
|---------|-----------|----------|
| Session cache | In-memory | Redis |
| Rate limit | In-memory | Redis |
| SQL lekérdezések | Inline | Stored Procedures |
| Frontend state | useState | React Query + Context |
| Bundle size | Nem vizsgált | Code splitting |

---

## 📝 7. ADMIN MODUL BŐVÍTÉSI JAVASLATOK

### 7.1 Jelenlegi admin funkciók
- ✅ Felhasználó kezelés (CRUD)
- 🔒 Beállítások (zárolva)
- 🔒 Riportok (zárolva)
- 🔒 Adatbázis (zárolva)

### 7.2 Javasolt admin beállítások

| Beállítás | Típus | Jelenlegi hely |
|-----------|-------|----------------|
| Session timeout (perc) | Szám | Hard-coded: 24h |
| Rate limit küszöb | Szám | Hard-coded: 5 |
| Rate limit ablak (perc) | Szám | Hard-coded: 15 |
| Excel import útvonalak | Szöveg | constants.ts |
| Napi cél percek | Szám | constants.ts: 480 |
| Min érvényes napi perc | Szám | constants.ts: 1000 |
| Pozíciók lista | Lista | SQL + hard-coded |
| Műszakok | Lista | SQL + hard-coded |
| Kritikus pozíciók | Lista | Hard-coded |
| Karbantartás mód | Boolean | Nincs |

### 7.3 Javasolt admin táblák

```sql
-- Rendszer beállítások
CREATE TABLE ainova_settings (
    setting_key NVARCHAR(50) PRIMARY KEY,
    setting_value NVARCHAR(MAX),
    setting_type NVARCHAR(20), -- 'string', 'number', 'boolean', 'json'
    description NVARCHAR(200),
    updated_at DATETIME DEFAULT GETDATE(),
    updated_by NVARCHAR(50)
);

-- Pozíciók (admin által szerkeszthető)
CREATE TABLE ainova_poziciok (
    id INT IDENTITY PRIMARY KEY,
    nev NVARCHAR(50) UNIQUE,
    tipus NVARCHAR(20), -- 'operativ', 'nem_operativ'
    is_kritikus BIT DEFAULT 0,
    sorrend INT,
    aktiv BIT DEFAULT 1
);
```

---

## 📁 8. JAVASOLT MAPPASZERKEZET

### Jelenlegi struktúra problémái:
- SQL scriptek keverve (migration, teszt, debug)
- Dokumentáció szétszórva (gyökérben)
- Nincs hooks mappa
- Nincs services mappa

### Javasolt struktúra:

```
ainova-clean/
├── docs/                      # Minden dokumentáció
│   ├── PROJEKT_AUDIT.md
│   ├── SETUP.md               # Egyesített setup guide
│   ├── API.md                 # API dokumentáció
│   ├── CHANGELOG.md           # Verziótörténet
│   └── modules/               # Modul dokumentációk
│       ├── auth.md
│       ├── letszam.md
│       ├── teljesitmeny.md
│       └── napi-perces.md
├── scripts/
│   ├── migrations/            # Verziózott migrációk
│   │   ├── 001_base_tables.sql
│   │   ├── 002_users_sessions.sql
│   │   ├── 003_letszam.sql
│   │   └── 004_teljesitmeny.sql
│   └── utils/                 # Segéd scriptek
│       ├── test-db-connection.js
│       └── generate-password-hash.js
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── constants.ts
│   ├── types/
│   ├── validators/
│   └── services/              # ÚJ: Üzleti logika
│       ├── teljesitmeny.service.ts
│       ├── letszam.service.ts
│       └── import.service.ts
├── hooks/                     # ÚJ: React hooks
│   ├── useAuth.ts
│   ├── useTeljesitmeny.ts
│   └── useLetszam.ts
├── components/
│   ├── ui/                    # Alap komponensek
│   ├── dashboard/
│   ├── letszam/
│   └── teljesitmeny/          # ÚJ: Teljesítmény komponensek
└── app/
    └── ...
```

---

## 📈 KÖVETKEZŐ LÉPÉSEK PRIORITÁS SZERINT

### 🔴 KRITIKUS (1-2 hét)
1. bcrypt duplikáció megszüntetése
2. Plain text jelszavak tiltása production-ben
3. Teljesítmény oldal darabolása komponensekre
4. Duplikált dokumentáció konszolidálása

### 🟡 FONTOS (2-4 hét)
5. Admin settings tábla és UI
6. Pozíciók adminból szerkeszthetőek
7. RBAC middleware
8. Service layer bevezetése

### 🟢 KÍVÁNATOS (1-2 hónap)
9. Redis cache bevezetése
10. React Query bevezetése
11. API dokumentáció generálás
12. E2E tesztek

---

*Ez a dokumentum a projekt jelenlegi állapotát tükrözi és alapul szolgál a fejlesztési terv elkészítéséhez.*
