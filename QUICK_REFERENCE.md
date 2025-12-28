# AINOVA - Gyors Referencia Útmutató

## 🎯 Mire Jó Ez a Program?

Az **AINOVA** egy vállalati webalkalmazás, amely **gyártási adatok kezelésére** lett tervezve:

1. **Létszám Nyilvántartás** - Napi műszakos létszám rögzítése (operatív és nem-operatív dolgozók)
2. **Teljesítmény Követés** - Gépenként teljesítmény adatok (fejlesztés alatt)
3. **Gépadat Kezelés** - Gépek állapota és paraméterei (fejlesztés alatt)
4. **Felhasználó Kezelés** - Admin panel felhasználók létrehozására/szerkesztésére

---

## 📚 Dokumentációs Struktúra

```
📖 README.md                  → Gyors start (kezdd itt!)
📘 PROJECT_OVERVIEW.md        → Teljes projekt leírás (70+ oldal)
📗 ARCHITECTURE.md            → Architektúra diagramok
📊 PROJECT_METRICS.md         → Statisztikák és metrikák
📄 scripts/db-schema.sql      → Adatbázis séma
```

### Mit Olvass El Először?

**Ha új vagy a projekten:**
1. `README.md` → Gyors áttekintés és telepítési útmutató (5 perc)
2. `PROJECT_OVERVIEW.md` → Részletes működés (30 perc)
3. `ARCHITECTURE.md` → Architektúra megértése (15 perc)

**Ha konkrét dolgot keresel:**
- **API dokumentáció** → `PROJECT_OVERVIEW.md` - "API Végpontok" fejezet
- **Adatbázis séma** → `PROJECT_OVERVIEW.md` - "Adatbázis Séma" fejezet vagy `scripts/db-schema.sql`
- **Komponensek** → `PROJECT_OVERVIEW.md` - "Frontend Komponensek" fejezet
- **Biztonság** → `PROJECT_OVERVIEW.md` - "Biztonsági Jellemzők" fejezet
- **Statisztikák** → `PROJECT_METRICS.md`
- **Flow diagramok** → `ARCHITECTURE.md`

---

## 🏗 Mit Tartalmaz a Program?

### 1. Bejelentkezési Rendszer

**Útvonal**: `/login`

**Funkciók:**
- Felhasználónév + jelszó alapú belépés
- Biztonságos jelszó tárolás (bcrypt hash)
- Rate limiting (5 sikertelen próbálkozás után 15 perc tiltás)
- Session kezelés (HTTP-only cookie, 24 óra lejárat)
- Audit trail (minden login kísérlet naplózva)

**Demo belépés:**
```
Felhasználónév: demo
Jelszó: demo123
```

### 2. Dashboard (Főoldal)

**Útvonal**: `/dashboard`

**4 modul választható:**
1. 👷 **Létszám Rögzítés** - Műszakos létszám adatok
2. 📊 **Teljesítmény Adat** - Gépenként teljesítmény (WIP)
3. ⚙️ **Gépadat Rögzítés** - Gépek állapota (WIP)
4. 🔐 **Admin Panel** - Felhasználók kezelése

### 3. Létszám Rögzítés Modul

**Útvonal**: `/dashboard/letszam`

**Mit lehet vele csinálni:**
- Műszak választás (A, B, C)
- Dátum választás (tetszőleges nap)
- Létszám adatok bevitele:
  - **Operatív pozíciók** (11 db): Huzalos tekercselő, Fóliás tekercselő, Előkészítő, stb.
  - **Nem-operatív pozíciók** (4 db): Műszakvezető, Előmunkás, Gyártásszervező, Minőségellenőr
- Automatikus számítások:
  - Hiányzás % (táppénz + szabadság / összlétszám)
  - Összesítő statisztikák

**Kritikus pozíciók ellenőrzése:**
- Ha Mérő, Csomagoló vagy Minőségellenőr hiányzik (0 megjelent)
- → Modal popup: indoklás kérése (miért, meddig, terv)

**Adatbeviteli mezők minden pozícióhoz:**
- Megjelent (dolgozók száma)
- Táppénz (táppénzen lévők)
- Szabadság (szabadságon lévők)
- Hiányzás % (automatikusan kalkulált)

### 4. Admin Panel

**Útvonal**: `/dashboard/admin`

**Funkciók:**
- Re-auth modal (jelszó újra kérése biztonsági okokból)
- Új felhasználó létrehozása
  - Username, Password, Teljes név, Szerepkör (User/Leader/Admin)
  - Automatikus jelszó hash generálás
- Felhasználók listázása (WIP)
- Felhasználók szerkesztése (WIP)
- Felhasználók törlése (WIP)

---

## 🗄 Adatbázis Kapcsolatok

```
┌─────────────────┐
│     Users       │ (Felhasználók)
│─────────────────│
│ UserId          │ ← Egyedi azonosító
│ Username        │ ← Belépési név (egyedi)
│ PasswordHash    │ ← bcrypt hash (12 rounds)
│ FullName        │ ← Teljes név
│ Role            │ ← User / Leader / Admin
│ FirstLogin      │ ← Első belépés flag
│ IsActive        │ ← Aktív/inaktív státusz
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         │ 1:N kapcsolat                   │ 1:N kapcsolat
         │                                 │
┌────────▼────────┐               ┌────────▼──────────┐
│    Sessions     │               │  LoginHistory     │
│─────────────────│               │───────────────────│
│ SessionId (UUID)│               │ LoginId           │
│ UserId          │               │ UserId            │
│ CreatedAt       │               │ LoginTime         │
│ ExpiresAt       │               │ IPAddress         │
└─────────────────┘               │ Success (0/1)     │
                                  │ FailureReason     │
Aktív munkamenetek                └───────────────────┘
(24 óra lejárat)                  Audit napló
                                  (minden login kísérlet)
```

### Táblák Magyarázata

#### 1. **Users** (Felhasználók)
- **Tárol**: Minden felhasználó adatait
- **Jelszó biztonság**: bcrypt hash (12 rounds, ~250ms hash idő)
- **Szerepkörök**: 
  - `User` - Normál felhasználó (létszám rögzítés)
  - `Leader` - Műszakvezető (extra jogok)
  - `Admin` - Rendszergazda (minden jog)

#### 2. **Sessions** (Munkamenetek)
- **Tárol**: Aktív bejelentkezéseket
- **Lejárat**: 24 óra után automatikusan törlődik
- **SessionId**: UUID v4 (nem kitalálható)
- **Cookie**: HTTP-only (JavaScript nem férhet hozzá)

#### 3. **LoginHistory** (Belépési napló)
- **Tárol**: MINDEN bejelentkezési kísérletet
- **Sikeres**: Success = 1, SessionId kitöltve
- **Sikertelen**: Success = 0, FailureReason (pl: "Invalid password")
- **Felhasználás**: Rate limiting, audit, security monitoring

---

## 🔌 API Végpontok Listája

### Authentikáció

```http
POST /api/auth/login
Body: { username, password }
→ Belépés + Session cookie létrehozás

POST /api/auth/logout
→ Kilépés + Session törlés

POST /api/auth/change-password
Body: { currentPassword, newPassword, confirmPassword }
→ Jelszó megváltoztatás
```

### Admin

```http
POST /api/admin/verify
Body: { password }
→ Admin jogosultság ellenőrzés (re-auth)

GET /api/admin/users
→ Felhasználók listázása

POST /api/admin/users
Body: { username, password, fullName, role }
→ Új felhasználó létrehozása
```

### Dashboard

```http
GET /api/dashboard/user
→ Bejelentkezett user adatai
```

### Utility

```http
GET /api/test-db
→ Adatbázis kapcsolat tesztelése

GET /api/weather
→ Példa API (external API integráció demo)
```

---

## 🔐 Biztonsági Funkciók

### 1. Jelszó Biztonság
- **bcrypt hashing** (12 rounds)
- **~250-350ms** hash idő (lassú = brute force elleni védelem)
- **Egyedi salt** minden jelszóhoz
- **Plain text jelszó SOHA nem kerül tárolásra**

### 2. Session Biztonság
- **HTTP-only cookies** (JavaScript nem férhet hozzá → XSS védelem)
- **Secure flag** (csak HTTPS, production-ben)
- **SameSite=Lax** (CSRF védelem)
- **24 óra lejárat** (automatikus cleanup)

### 3. Rate Limiting
- **5 sikertelen próbálkozás / 15 perc** IP címenként
- **Hibaüzenet**: "Túl sok sikertelen bejelentkezési kísérlet"
- **Dual-layer**: Adatbázis + memória (ha DB fail)

### 4. SQL Injection Védelem
- **Parameterized queries** (MINDEN adatbázis hívásnál)
- **Input validáció** (type, length, format)
- **TypeScript** (compile-time type checking)

### 5. Audit Trail
- **LoginHistory tábla** (minden login kísérlet naplózva)
- **IP address tracking** (gyanús tevékenység észlelése)
- **Failure reason** (sikertelen belépés oka)

---

## 💻 Használati Példák

### Login Flow (Felhasználói Nézőpont)

```
1. Megnyitod a böngészőt → http://localhost:3000
   ↓
2. Automatikus redirect → /login
   ↓
3. Begépeled: username = "demo", password = "demo123"
   ↓
4. Kattintasz a "Bejelentkezés" gombra
   ↓
5. Loading animáció... (~300ms)
   ↓
6. Toast üzenet: "Sikeres belépés!" (zöld)
   ↓
7. Átirányítás → /dashboard
   ↓
8. Dashboard látható (4 modul tile)
```

### Létszám Rögzítés Flow

```
1. Dashboard → Kattintás "LÉTSZÁM RÖGZÍTÉS" tile-ra
   ↓
2. Létszám oldal megnyílik
   ↓
3. Műszak választás: "A" (default)
   ↓
4. Dátum választás: Ma (default)
   ↓
5. Adatok bevitele minden pozícióhoz:
   - Huzalos tekercselő: Megjelent = 5, Táppénz = 1, Szabadság = 0
   - Fóliás tekercselő: Megjelent = 3, Táppénz = 0, Szabadság = 1
   - ... (további pozíciók)
   ↓
6. Hiányzás % automatikusan kalkulálódik
   ↓
7. Összesítő frissül (összes megjelent, táppénz, szabadság)
   ↓
8. Kattintás "Mentés" gombra
   ↓
9. Ellenőrzés: Van kritikus pozíció 0 megjelenttel?
   - Ha IGEN → Modal: "Kérlek indokold meg..." (textarea)
   - Ha NEM → Mentés
   ↓
10. Toast: "Adatok sikeresen mentve!" (zöld)
    ↓
11. Átirányítás → /dashboard
```

### Admin - Új Felhasználó Létrehozás

```
1. Dashboard → Kattintás "ADMIN PANEL" tile-ra
   ↓
2. Re-auth modal: "Add meg a jelszavad!"
   ↓
3. Jelszó beírása → Verify
   ↓
4. Admin panel megnyílik
   ↓
5. Kattintás "FELHASZNÁLÓK" kártyára
   ↓
6. Új felhasználó form:
   - Username: "ujfelhasznalo"
   - Password: "tempPass123"
   - Teljes név: "Új Felhasználó"
   - Szerepkör: "User"
   ↓
7. Kattintás "Létrehozás" gombra
   ↓
8. Backend: bcrypt hash generálás (~250ms)
   ↓
9. INSERT INTO Users (...)
   ↓
10. Toast: "Felhasználó sikeresen létrehozva!"
```

---

## 🛠 Technológiák Röviden

```
Frontend:
• React 19         → UI library
• Next.js 16       → Framework (SSR + API routes)
• TypeScript 5     → Type safety
• Tailwind CSS     → Styling (utility-first)
• Framer Motion    → Animációk

Backend:
• Next.js API      → REST-like endpoints
• Node.js 20       → Runtime
• mssql            → SQL Server driver
• bcryptjs         → Jelszó hashing

Database:
• SQL Server       → Production
• LocalDB          → Development
```

---

## 🎯 Ki Használja?

### Célcsoport

1. **Műszakvezetők** → Létszám rögzítés naponta
2. **Gyártásszervezők** → Teljesítmény és gépadat követés
3. **Adminok** → Felhasználók kezelése
4. **Menedzsment** → Riportok (jövőbeni fejlesztés)

### Tipikus Használat (Napi Rutin)

**Reggel 6:00 - A műszak kezdete:**
```
1. Műszakvezető belép (username + password)
2. Dashboard → "LÉTSZÁM RÖGZÍTÉS"
3. Műszak: A, Dátum: Ma
4. Kitölti a létszám adatokat (5 perc)
5. Mentés → Kilépés
```

**Délután 14:00 - B műszak kezdete:**
```
(Ugyanaz, de Műszak: B)
```

**Este 22:00 - C műszak kezdete:**
```
(Ugyanaz, de Műszak: C)
```

---

## 📞 Gyakori Kérdések (FAQ)

### Q: Hogyan indítsam el a programot?

```bash
# 1. Dependencies telepítése
npm install

# 2. .env.local létrehozása (lásd README.md)

# 3. Adatbázis séma futtatása (scripts/db-schema.sql)

# 4. Fejlesztői szerver indítása
npm run dev

# 5. Böngésző → http://localhost:3000
```

### Q: Mit tegyek, ha elfelejtettem a jelszavat?

Admin user tud új jelszót generálni vagy közvetlenül az adatbázisban módosítható:

```sql
-- Új jelszó hash generálása (demo123):
UPDATE Users
SET PasswordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi'
WHERE Username = 'demo';
```

### Q: Hol találom az adatbázis kapcsolati stringet?

`.env.local` fájlban (nem kerül git-be):

```env
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=AINOVA_DEV
DB_USER=sa
DB_PASSWORD=YourPassword123!
```

### Q: Mik azok a kritikus pozíciók?

Pozíciók, amelyek nélkül a gyártás NEM mehet:
- **Mérő** - Termékek minőségének ellenőrzése
- **Csomagoló** - Késztermékek csomagolása
- **Minőségellenőr** - Végső minőségi ellenőrzés

Ha bármelyik 0 megjelenttel rendelkezik → Indoklás szükséges!

### Q: Miért kell újra jelszót adni az Admin panelnél?

**Re-authentication** biztonsági funkció:
- Admin műveletek érzékenyek (pl: felhasználó törlése)
- Ellenőrizzük, hogy valóban te ülsz a gép előtt
- Nem elég a session cookie (lehet, hogy valaki más ül oda)

### Q: Hol van a kód?

```
Frontend (UI):        components/ és app/
Backend (logika):     lib/ és app/api/
Adatbázis séma:       scripts/db-schema.sql
Dokumentáció:         *.md fájlok
```

---

## 🚀 Következő Lépések

### Ha fejlesztő vagy:

1. Olvasd el: `PROJECT_OVERVIEW.md` (teljes projekt megértése)
2. Olvasd el: `ARCHITECTURE.md` (architektúra)
3. Nézd meg: `lib/auth.ts` és `lib/db.ts` (core logic)
4. Építsd le locally: `npm install` → `npm run dev`

### Ha használó vagy:

1. Kérj hozzáférést az admintól (username + jelszó)
2. Jelentkezz be: `http://localhost:3000` (vagy production URL)
3. Dashboard → Válaszd a megfelelő modult
4. Kövesd a UI instrukciókat

### Ha menedzser vagy:

1. Olvasd el: `PROJECT_METRICS.md` (statisztikák)
2. Olvasd el: `PROJECT_OVERVIEW.md` → "Roadmap" fejezet
3. Review: Funkcionális készültségi státusz (60% production ready)

---

**Készült**: 2024-12-28  
**Verzió**: 0.1.0  
**Nyelv**: Magyar (Hungarian)  
**Szerző**: AI Assistant + Development Team
