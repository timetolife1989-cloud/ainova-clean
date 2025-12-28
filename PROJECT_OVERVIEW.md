# AINOVA - Projekt Teljes Áttekintés (Complete Project Overview)

## 📋 Tartalomjegyzék (Table of Contents)

1. [Projekt Összefoglaló](#projekt-összefoglaló)
2. [Technológiai Stack](#technológiai-stack)
3. [Projekt Struktúra](#projekt-struktúra)
4. [Adatbázis Séma](#adatbázis-séma)
5. [Authentikáció és Jogosultságkezelés](#authentikáció-és-jogosultságkezelés)
6. [API Végpontok](#api-végpontok)
7. [Frontend Komponensek](#frontend-komponensek)
8. [Modulok és Funkciók](#modulok-és-funkciók)
9. [Biztonsági Jellemzők](#biztonsági-jellemzők)
10. [Kapcsolatok és Függőségek](#kapcsolatok-és-függőségek)

---

## 🎯 Projekt Összefoglaló

**AINOVA** egy Next.js 16 alapú vállalati webalkalmazás, amely gyártási létszám- és teljesítményadatok kezelésére lett tervezve. Az alkalmazás modern, reszponzív felhasználói felülettel rendelkezik, amely Framer Motion animációkat használ a jobb felhasználói élmény érdekében.

### Fő Célok:
- **Létszám Rögzítés**: Napi műszakos létszámadatok felvitele és nyomon követése
- **Teljesítmény Adat Rögzítés**: Gépenként teljesítmény nyomon követése
- **Gépadat Rögzítés**: Gépek állapotának és paramétereinek kezelése
- **Admin Panel**: Felhasználók és rendszer beállítások kezelése

### Projekt Státusz:
- **Verzió**: 0.1.0
- **Fejlesztési Fázis**: Aktív fejlesztés alatt
- **Produkciós Kész Komponensek**: Login, Dashboard, Létszám modul (frontend), Auth rendszer
- **Fejlesztés Alatt**: API végpontok, Admin funkciók

---

## 🛠 Technológiai Stack

### Backend
- **Next.js 16.1.0** - React framework server-side rendering és API routes támogatással
- **TypeScript 5** - Type-safe fejlesztés
- **Node.js 20** - Runtime környezet
- **SQL Server / LocalDB** - Relációs adatbázis (mssql ^10.0.0)
- **bcryptjs ^2.4.3** - Jelszó hashelés (12 rounds)

### Frontend
- **React 19.2.3** - UI library
- **React DOM 19.2.3** - React rendering
- **Framer Motion ^12.23.26** - Animációk és transitions
- **Tailwind CSS ^4** - Utility-first CSS framework
- **PostCSS** - CSS preprocessing

### Dev Tools
- **ESLint 9** - Code linting
- **TypeScript Compiler** - Type checking
- **Next.js Dev Server** - Hot reload development

### Biztonsági Eszközök
- **bcryptjs** - Password hashing
- **HTTP-only cookies** - Session management
- **Parameterized SQL queries** - SQL injection protection
- **Rate limiting** - Brute force attack prevention
- **Input validation** - XSS/CSRF protection

---

## 📁 Projekt Struktúra

```
ainova-clean/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── api/                      # Backend API végpontok
│   │   ├── admin/                # Admin funkcionalitások
│   │   │   ├── verify/           # Admin jogosultság ellenőrzés
│   │   │   └── users/            # Felhasználó kezelés API
│   │   ├── auth/                 # Authentikációs végpontok
│   │   │   ├── login/            # Bejelentkezés
│   │   │   ├── logout/           # Kijelentkezés
│   │   │   └── change-password/  # Jelszó változtatás
│   │   ├── dashboard/            # Dashboard adatok
│   │   │   └── user/             # User specifikus adatok
│   │   ├── test-db/              # DB kapcsolat tesztelés
│   │   └── weather/              # Példa API endpoint
│   ├── dashboard/                # Főoldal modulok
│   │   ├── admin/                # Admin panel
│   │   │   ├── page.tsx          # Admin főoldal
│   │   │   └── users/new/        # Új felhasználó létrehozás
│   │   ├── letszam/              # Létszám modul
│   │   │   └── page.tsx          # Létszám rögzítés UI
│   │   ├── layout.tsx            # Dashboard közös layout
│   │   └── page.tsx              # Dashboard főoldal (menu tiles)
│   ├── change-password/          # Jelszó változtatás oldal
│   ├── login/                    # Login oldal
│   │   └── page.tsx              # Login UI
│   ├── layout.tsx                # Root layout (global)
│   ├── page.tsx                  # Home page (redirect to /login)
│   └── globals.css               # Global stílusok
│
├── components/                   # Újrafelhasználható React komponensek
│   ├── dashboard/                # Dashboard komponensek
│   │   ├── admin/                # Admin specifikus komponensek
│   │   │   ├── AdminAuthModal.tsx    # Re-auth modal
│   │   │   └── AdminMenuCard.tsx     # Admin menu kártya
│   │   ├── Header.tsx            # Dashboard header (vissza gomb + cím)
│   │   ├── MenuTile.tsx          # Dashboard modul tile
│   │   └── index.ts              # Export barrel file
│   ├── letszam/                  # Létszám modul komponensek
│   │   ├── DateSelector.tsx      # Dátum választó
│   │   ├── KritikusPozicioModal.tsx  # Kritikus hiány figyelmeztetés
│   │   ├── LetszamSummary.tsx    # Összesítő statisztikák
│   │   ├── LetszamTable.tsx      # Létszám adatok tábla
│   │   ├── MuszakSelector.tsx    # Műszak választó (A/B/C)
│   │   └── types.ts              # TypeScript interface-ek
│   ├── login/                    # Login komponensek
│   │   ├── AinovaLogo.tsx        # Logo komponens
│   │   ├── InputField.tsx        # Custom input field
│   │   ├── InteractiveBackground.tsx  # Animated háttér
│   │   ├── LoginContainer.tsx    # Login form container
│   │   ├── RippleButton.tsx      # Animated button
│   │   └── ToastNotification.tsx # Toast üzenetek
│   └── Card.tsx                  # Általános card komponens
│
├── lib/                          # Backend üzleti logika (server-side)
│   ├── auth.ts                   # Authentikáció és session kezelés
│   └── db.ts                     # SQL Server kapcsolat pool (singleton)
│
├── scripts/                      # Utility scriptek
│   └── db-schema.sql             # Adatbázis séma definíció
│
├── public/                       # Statikus fájlok (képek, SVG-k)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── package.json                  # NPM dependencies
├── tsconfig.json                 # TypeScript konfiguráció
├── next.config.ts                # Next.js konfiguráció
├── eslint.config.mjs             # ESLint szabályok
├── postcss.config.mjs            # PostCSS konfiguráció
├── proxy.ts                      # Proxy beállítások (ha szükséges)
└── README.md                     # Projekt dokumentáció (rövid)
```

### Kód Statisztikák:
- **TypeScript/TSX fájlok**: ~40 fájl
- **Kód sorok összesen**: ~4,557 sor
- **API végpontok**: 8 route handler
- **React komponensek**: 20+ komponens
- **Adatbázis táblák**: 3 (Users, Sessions, LoginHistory)

---

## 🗄 Adatbázis Séma

Az alkalmazás **SQL Server** vagy **LocalDB** adatbázist használ. A séma 3 fő táblát tartalmaz:

### 1. **dbo.Users** - Felhasználói fiókok
Tárolja az összes felhasználó adatait (vezetők, adminok, dolgozók).

```sql
CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,         -- bcrypt hash (12 rounds)
    FullName NVARCHAR(200) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'User',   -- 'User', 'Leader', 'Admin'
    FirstLogin BIT NOT NULL DEFAULT 1,           -- Első bejelentkezés flag
    IsActive BIT NOT NULL DEFAULT 1,             -- Aktív/inaktív státusz
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

**Indexek:**
- `IX_Users_Username` - Gyors username lookup

**Szerepkörök:**
- `User` - Alapértelmezett felhasználó
- `Leader` - Műszakvezető/előmunkás
- `Admin` - Rendszergazda (teljes hozzáférés)

### 2. **dbo.Sessions** - Aktív session-ök
HTTP-only cookie alapú authentikáció session tárolása.

```sql
CREATE TABLE dbo.Sessions (
    SessionId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ExpiresAt DATETIME2 NOT NULL,                -- 24 óra lejárat
    CONSTRAINT FK_Sessions_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);
```

**Indexek:**
- `IX_Sessions_ExpiresAt` - Lejárt session-ök cleanup
- `IX_Sessions_UserId` - User session-jeinek lekérése

**Automatizmus:**
- `ON DELETE CASCADE` - User törlése törli a session-öket is

### 3. **dbo.LoginHistory** - Audit trail
Minden bejelentkezési kísérlet naplózása (sikeres és sikertelen egyaránt).

```sql
CREATE TABLE dbo.LoginHistory (
    LoginId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    SessionId UNIQUEIDENTIFIER NULL,             -- NULL ha sikertelen
    LoginTime DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IPAddress NVARCHAR(50) NULL,
    Success BIT NOT NULL,                        -- 1 = sikeres, 0 = sikertelen
    FailureReason NVARCHAR(200) NULL,            -- Pl: "Invalid password"
    CONSTRAINT FK_LoginHistory_Users FOREIGN KEY (UserId) 
        REFERENCES dbo.Users(UserId)
);
```

**Indexek:**
- `IX_LoginHistory_UserId` - User login történet
- `IX_LoginHistory_LoginTime` - Időrendi rendezés

**Felhasználás:**
- **Rate limiting**: Utolsó 15 percben 5+ sikertelen próbálkozás = tiltás
- **Security audit**: Gyanús tevékenység észlelés
- **Compliance**: GDPR / ISO 27001 követelmények

### Seed Adat (Demo User)
```
Username: demo
Password: demo123
Role: Admin
PasswordHash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6wEF2kGxSi
```

### Kapcsolatok (Foreign Keys):
```
Users (1) ──< Sessions (N)        ON DELETE CASCADE
Users (1) ──< LoginHistory (N)    ON DELETE NO ACTION
```

---

## 🔐 Authentikáció és Jogosultságkezelés

Az AINOVA egy **enterprise-grade** authentikációs rendszert használ teljes biztonsági funkciókkal.

### Authentikációs Flow

#### 1. **Login Process** (`/api/auth/login`)

```typescript
// Client → Server
POST /api/auth/login
{
  username: "demo",
  password: "demo123"
}

// Flow:
1. Input validáció (empty, type, length)
2. Rate limit ellenőrzés (5 fail / 15 min)
3. User lekérdezés (SQL parameterized query)
4. IsActive flag ellenőrzés
5. bcrypt.compare() - jelszó ellenőrzés
6. Session létrehozás (UUID v4)
7. LoginHistory naplózás (audit)
8. HTTP-only cookie beállítás
9. User adatok visszaküldése (role, fullName)

// Success response:
{
  success: true,
  user: {
    userId: 1,
    username: "demo",
    fullName: "Demo Felhasználó",
    role: "Admin"
  },
  redirect: "/dashboard"  // vagy "/change-password" ha FirstLogin = 1
}

// Cookie (HTTP-only, secure, SameSite=lax):
Set-Cookie: sessionId=<UUID>; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

#### 2. **Session Validation** (minden védett route-on)

```typescript
// Minden API hívás elején:
const sessionId = request.cookies.get('sessionId');
const session = await validateSession(sessionId);

if (!session) {
  return NextResponse.redirect('/login?returnUrl=/dashboard');
}

// Session cache (5 min TTL):
- In-memory Map<sessionId, SessionData>
- Csökkenti DB lekérdezéseket (performance optimization)
- Automatikus cleanup (5 percenként)
```

#### 3. **Logout Process** (`/api/auth/logout`)

```typescript
// Client → Server
POST /api/auth/logout

// Flow:
1. Session ID kiolvasása cookie-ból
2. Session törlése DB-ből
3. Session törlése cache-ből
4. Cookie törlése (Max-Age=0)

// Response:
{
  success: true
}
```

### Biztonsági Funkciók

#### Rate Limiting
- **5 sikertelen próbálkozás / 15 perc** IP címenként
- **Dual-layer**: DB + in-memory fallback (ha DB fail)
- **Hibaüzenet**: "Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva."

#### Password Security
- **bcrypt hashing** (12 rounds - ~250-350ms hash idő)
- **Plain text jelszó SOHA nem kerül tárolásra**
- **Password validation**: Min/max length, character types

#### Session Security
- **HTTP-only cookies** - JavaScript nem férhet hozzá (XSS védelem)
- **Secure flag** - Csak HTTPS-en keresztül küldve (production)
- **SameSite=Lax** - CSRF védelem
- **24 óra lejárat** - Automatikus session cleanup

#### SQL Injection Védelem
- **Parameterized queries** MINDEN adatbázis hívásnál
- **Input validation** minden API endpoint-on
- **Type checking** (TypeScript + runtime validáció)

#### DoS Protection
- **Input length limitek** (username: 100, password: 500 karakter)
- **Connection pooling** (max 10 connection)
- **Timeout-ok** (connection: 10s, request: 15s)

### Jogosultságkezelés (Role-Based Access Control)

```typescript
// Szerepkörök:
enum UserRole {
  User = "User",        // Alapértelmezett felhasználó
  Leader = "Leader",    // Műszakvezető (extra funkciók)
  Admin = "Admin"       // Teljes hozzáférés
}

// Admin védett route példa:
const session = await validateSession(sessionId);
if (session.role !== 'Admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### Feature Flags (Környezeti Változók)
```bash
# .env.local
FE_LOGIN_RATE_LIMIT=true              # Rate limiting engedélyezése
FE_LOGIN_AUDIT=true                   # LoginHistory naplózás
FE_LOGIN_FIRST_LOGIN_FORCE=true       # Első login → jelszó változtatás
```

---

## 🌐 API Végpontok

Az AINOVA Next.js API Routes-ot használ REST-like API-hoz.

### Authentication API

#### `POST /api/auth/login`
Felhasználó bejelentkeztetése.

**Request:**
```json
{
  "username": "demo",
  "password": "demo123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "userId": 1,
    "username": "demo",
    "fullName": "Demo Felhasználó",
    "role": "Admin"
  },
  "redirect": "/dashboard"
}
```

**Error Responses:**
- `400` - Invalid input (missing/empty fields)
- `401` - Invalid credentials
- `403` - Account disabled
- `429` - Rate limit exceeded (5 fails / 15 min)
- `503` - Service unavailable (DB down)

#### `POST /api/auth/logout`
Session törlése és kijelentkezés.

**Response:**
```json
{
  "success": true
}
```

#### `POST /api/auth/change-password`
Jelszó változtatás (első login vagy user-initiated).

**Request:**
```json
{
  "currentPassword": "demo123",
  "newPassword": "newSecurePass123!",
  "confirmPassword": "newSecurePass123!"
}
```

### Admin API

#### `POST /api/admin/verify`
Admin jogosultság ellenőrzés (re-auth).

**Request:**
```json
{
  "password": "currentPassword"
}
```

**Response:**
```json
{
  "verified": true,
  "role": "Admin"
}
```

#### `GET /api/admin/users`
Felhasználók listázása (csak Admin).

**Response:**
```json
{
  "users": [
    {
      "userId": 1,
      "username": "demo",
      "fullName": "Demo Felhasználó",
      "role": "Admin",
      "isActive": true,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### `POST /api/admin/users`
Új felhasználó létrehozása.

**Request:**
```json
{
  "username": "newuser",
  "password": "tempPassword123",
  "fullName": "Új Felhasználó",
  "role": "User"
}
```

### Dashboard API

#### `GET /api/dashboard/user`
Bejelentkezett user adatainak lekérése.

**Response:**
```json
{
  "userId": 1,
  "username": "demo",
  "fullName": "Demo Felhasználó",
  "role": "Admin"
}
```

### Utility API

#### `GET /api/test-db`
Adatbázis kapcsolat tesztelése (development).

**Response:**
```json
{
  "status": "connected",
  "database": "AINOVA_DEV",
  "server": "localhost\\SQLEXPRESS"
}
```

#### `GET /api/weather`
Példa API endpoint (external API integráció demo).

### API Route Konvenciók
- **HTTP Methods**: POST = mutation, GET = query
- **Response Format**: Always JSON
- **Error Format**: `{ success: false, error: "Message" }`
- **Auth Check**: Minden védett route ellenőrzi a sessionId cookie-t
- **Validation**: Input validáció minden POST endpoint-on

---

## 🎨 Frontend Komponensek

Az AINOVA modern, komponens-alapú React architektúrát használ.

### Layout Komponensek

#### `app/layout.tsx` - Root Layout
```typescript
// Global layout minden oldalhoz
- Tailwind CSS betöltés
- Font optimalizáció (Geist)
- Metadata definíció
```

#### `app/dashboard/layout.tsx` - Dashboard Layout
```typescript
// Közös layout dashboard modulokhoz
- Header komponens
- Session validáció
- Framer Motion AnimatePresence
```

### Login Modul Komponensek

#### `components/login/LoginContainer.tsx`
```typescript
// Főbb jellemzők:
- Glassmorphism design
- Glow states: idle | success | error
- Responsive (mobile-first)
- Framer Motion animations
```

#### `components/login/InputField.tsx`
```typescript
// Custom input field komponens:
- Label + placeholder
- Password show/hide toggle
- Focus states (border color változás)
- Error states (piros border)
```

#### `components/login/RippleButton.tsx`
```typescript
// Animated submit button:
- Ripple effect (kattintáskor)
- Loading spinner state
- Disabled state
- Hover animations (scale, shadow)
```

#### `components/login/ToastNotification.tsx`
```typescript
// Toast üzenetek:
- 4 típus: success, error, warning, info
- Auto-hide (3 másodperc után)
- Slide-in animáció (right → center)
- Icon + message display
```

#### `components/login/InteractiveBackground.tsx`
```typescript
// Animated háttér:
- Gradient mesh animation
- Moving bubbles (parallax effect)
- Reduced motion support
- Performance optimized
```

#### `components/login/AinovaLogo.tsx`
```typescript
// Company logo komponens:
- SVG vagy text-based logo
- Animated entrance
- Responsive sizing
```

### Dashboard Komponensek

#### `components/dashboard/Header.tsx`
```typescript
// Dashboard header bar:
Props:
- pageTitle: string          // "VEZÉRLŐPULT", "LÉTSZÁM ADATOK"
- showBackButton: boolean    // Vissza nyíl megjelenítése

Features:
- Sticky positioning (mindig látható scroll-nál)
- Logout button (jobb felső sarok)
- Back navigation (useRouter.back())
- Animated transitions
```

#### `components/dashboard/MenuTile.tsx`
```typescript
// Dashboard modul választó kártya:
Props:
- icon: string               // Emoji icon (pl: "👷", "📊")
- title: string              // "LÉTSZÁM RÖGZÍTÉS"
- description: string        // Rövid leírás
- href: string               // Link target
- variant?: "default" | "admin"  // Szín variáns

Features:
- Hover animations (scale, glow)
- Click animations (tap scale down)
- Gradient borders
- Icon + text layout
```

### Létszám Modul Komponensek

#### `components/letszam/MuszakSelector.tsx`
```typescript
// Műszak választó (A/B/C):
Props:
- selected: 'A' | 'B' | 'C'
- onChange: (muszak) => void

UI:
- 3 button (A, B, C)
- Active state (blue gradient)
- Inactive state (gray)
```

#### `components/letszam/DateSelector.tsx`
```typescript
// Dátum választó:
Props:
- selected: Date
- onChange: (date) => void

Features:
- Native date input
- Today button (gyors reset)
- Date format: YYYY-MM-DD
- Locale: hu-HU
```

#### `components/letszam/LetszamTable.tsx`
```typescript
// Létszám adat beviteli tábla:
Props:
- title: string                    // "🔧 OPERATÍV LÉTSZÁM"
- positions: string[]              // Pozíciók listája
- data: LetszamRow[]               // Adat sorok
- onChange: (index, field, value) => void
- isOperativ: boolean              // Operatív vs Nem-operatív
- criticalPositions: string[]      // Kritikus pozíciók

Oszlopok:
- Pozíció neve
- Megjelent (input)
- Táppénz (input)
- Szabadság (input)
- Hiányzás % (kalkulált, read-only)

Features:
- Number input fields (min: 0)
- Auto-calculation (hiányzás %)
- Kritikus pozíció highlighting (piros)
- Responsive table design
```

#### `components/letszam/LetszamSummary.tsx`
```typescript
// Összesítő statisztikák:
Props:
- data: LetszamRow[]
- isOperativ: boolean

Kalkulált értékek:
- Összes megjelent
- Összes táppénz
- Összes szabadság
- Átlagos hiányzás %

UI:
- Stat cards (2x2 grid)
- Number animations
- Color coding (green = good, red = bad)
```

#### `components/letszam/KritikusPozicioModal.tsx`
```typescript
// Kritikus hiány figyelmeztetés modal:
Props:
- isOpen: boolean
- onClose: () => void
- onConfirm: (indoklas) => void
- kritikusHianyList: { pozicio, count }[]

Features:
- Blocking modal (nem lehet bezárni save nélkül)
- 3 textarea mező:
  1. Miért van hiány? (required)
  2. Meddig tart? (required)
  3. Milyen terv van rá? (required)
- Validation (min 10 karakter)
- Save button (csak valid input esetén enabled)
```

### Admin Komponensek

#### `components/dashboard/admin/AdminAuthModal.tsx`
```typescript
// Re-auth modal admin panel-hoz:
Props:
- isOpen: boolean
- onClose: () => void
- onSuccess: () => void

Features:
- Password input
- Session verification API call
- Error handling
- Modal overlay (backdrop blur)
```

#### `components/dashboard/admin/AdminMenuCard.tsx`
```typescript
// Admin funkció kártya:
Props:
- icon: string
- title: string
- description: string
- href?: string
- locked: boolean              // Fejlesztés alatt flag

Features:
- Locked state (opacity 50%, click disabled)
- "Hamarosan" badge (locked items)
- Hover animations
```

### Komponens Hierarchia

```
app/layout.tsx (Root)
└── app/login/page.tsx
    ├── InteractiveBackground
    └── LoginContainer
        ├── AinovaLogo
        ├── InputField (username)
        ├── InputField (password)
        ├── RippleButton
        └── ToastNotification

app/dashboard/layout.tsx
└── app/dashboard/page.tsx
    ├── Header
    └── MenuTile (×4)

app/dashboard/letszam/page.tsx
├── Header
├── MuszakSelector
├── DateSelector
├── LetszamTable (×2: operativ + nem-operativ)
│   └── LetszamSummary (×2)
└── KritikusPozicioModal

app/dashboard/admin/page.tsx
├── Header
├── AdminAuthModal
└── AdminMenuCard (×4)
```

---

## 📦 Modulok és Funkciók

Az AINOVA 3+1 fő modult tartalmaz.

### 1. Létszám Rögzítés Modul

**Route**: `/dashboard/letszam`  
**Státusz**: ✅ Frontend kész, Backend fejlesztés alatt

#### Funkciók:
- **Műszak választás**: A, B, C műszakok
- **Dátum választás**: Tetszőleges nap kiválasztása
- **Operatív létszám**: 11 pozíció (Huzalos tekercselő, Fóliás tekercselő, stb.)
- **Nem-operatív létszám**: 4 pozíció (Műszakvezető, Előmunkás, stb.)
- **Adatbevitel**:
  - Megjelent (megjelent dolgozók száma)
  - Táppénz (táppénzen lévők száma)
  - Szabadság (szabadságon lévők száma)
  - Hiányzás % (automatikusan kalkulált)
- **Kritikus pozíció ellenőrzés**: Mérő, Csomagoló, Minőségellenőr
- **Validáció**: Ha kritikus pozíción 0 megjelent → indoklás kérése

#### Operatív Pozíciók:
1. Huzalos tekercselő
2. Fóliás tekercselő
3. Előkészítő
4. LaC szerelő
5. Lézervágó
6. Maró-ónozó
7. DC szerelő
8. Mérő ⚠️ (kritikus)
9. Impregnáló
10. Végszerelő
11. Csomagoló ⚠️ (kritikus)

#### Nem-Operatív Pozíciók:
1. Műszakvezető
2. Előmunkás
3. Gyártásszervező
4. Minőségellenőr ⚠️ (kritikus)

#### Üzleti Logika:
```typescript
// Hiányzás % kalkuláció:
const total = megjelent + tappenz + szabadsag;
const hianyzasPercent = total > 0 
  ? ((tappenz + szabadsag) / total) * 100 
  : 0;

// Kritikus pozíció ellenőrzés (mentés előtt):
if (megjelent === 0 && position in KRITIKUS_POZICIOK) {
  showKritikusModal();  // Indoklás kérése
}
```

#### API Endpoint (fejlesztés alatt):
```typescript
// GET /api/letszam?datum=2024-12-28&muszak=A
// Response:
{
  success: true,
  data: {
    operativ: [...],
    nemOperativ: [...]
  }
}

// POST /api/letszam
// Request:
{
  muszak: "A",
  datum: "2024-12-28",
  operativ: [...],
  nemOperativ: [...],
  indoklas?: {...}  // Ha kritikus pozíció hiányzik
}
```

### 2. Teljesítmény Adat Rögzítés

**Route**: `/dashboard/teljesitmeny`  
**Státusz**: 🚧 Fejlesztés alatt (placeholder)

#### Tervezett Funkciók:
- Gép választás
- Teljesítmény adatok (darab/óra, min/max értékek)
- Műszak összehasonlítás
- Trend grafikonok

### 3. Gépadat Rögzítés

**Route**: `/dashboard/gepadat`  
**Státusz**: 🚧 Fejlesztés alatt (placeholder)

#### Tervezett Funkciók:
- Gép állapot (működik, karbantartás, meghibásodás)
- Üzemóra számláló
- Karbantartási napló
- Alkatrész cserék

### 4. Admin Panel

**Route**: `/dashboard/admin`  
**Státusz**: ⚙️ Részben kész

#### Elérhető Funkciók:
- **Re-auth modal**: Jelszó újra kérése belépéskor
- **Felhasználó létrehozás**: `/dashboard/admin/users/new`
  - Username, password, fullName, role megadása
  - Automatikus bcrypt hash generálás
  - FirstLogin flag beállítás

#### Fejlesztés Alatt:
- **Felhasználók listázása és szerkesztése**
- **Beállítások** (locked)
- **Riportok** (locked)
- **Adatbázis kezelés** (locked)

---

## 🔒 Biztonsági Jellemzők

Az AINOVA enterprise-szintű biztonsági módszereket alkalmaz.

### 1. Authentikációs Biztonság

#### Password Hashing
- **bcrypt** algoritmus, **12 rounds**
- **~250-350ms** hash idő (brute force védelem)
- **Salted hash** (minden jelszóhoz egyedi salt)
- **Plain text jelszó SOHA nem kerül tárolásra**

#### Session Management
- **HTTP-only cookies** → JavaScript nem férhet hozzá (XSS védelem)
- **Secure flag** → Csak HTTPS (production)
- **SameSite=Lax** → CSRF védelem
- **24 óra lejárat** → Automatikus cleanup
- **UUID v4 session ID** → Nem kitalálható

#### Rate Limiting
- **5 sikertelen próbálkozás / 15 perc** IP címenként
- **Dual-layer**: DB + in-memory fallback
- **DDoS védelem**: IP blacklist támogatás (jövőbeni fejlesztés)

### 2. SQL Injection Védelem

#### Parameterized Queries
```typescript
// ❌ ROSSZ (SQL injection vulnerable):
const query = `SELECT * FROM Users WHERE Username = '${username}'`;

// ✅ JÓ (parameterized query):
await pool
  .request()
  .input('username', sql.NVarChar(100), username)
  .query('SELECT * FROM Users WHERE Username = @username');
```

#### Type Safety
- **TypeScript** minden API endpoint-on
- **Runtime validáció** (typeof checks)
- **Input length limitek** (DoS védelem)

### 3. XSS (Cross-Site Scripting) Védelem

#### React Built-in Escaping
- **Automatic HTML escaping** JSX-ben
- **dangerouslySetInnerHTML TILTVA**
- **User input sanitization** API layer-en

#### Content Security Policy (CSP)
```typescript
// Jövőbeni fejlesztés: next.config.ts
headers: {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'"
}
```

### 4. CSRF (Cross-Site Request Forgery) Védelem

#### SameSite Cookie Attribute
```typescript
response.cookies.set('sessionId', sessionId, {
  sameSite: 'lax',  // Cookie nem küldődik cross-site POST-nál
});
```

#### Token-Based CSRF (jövőbeni fejlesztés)
- CSRF token generálás minden form-nál
- Token validáció POST request-eknél

### 5. DoS (Denial of Service) Védelem

#### Input Validation
```typescript
// Username: max 100 karakter
// Password: max 500 karakter (passphrase support, de DoS védelem)
if (username.length > 100 || password.length > 500) {
  return error(400, 'Input túl hosszú');
}
```

#### Connection Pooling
```typescript
// Max 10 concurrent DB connection
pool: {
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
}
```

#### Timeout Protection
```typescript
connectionTimeout: 10000,  // 10 másodperc
requestTimeout: 15000,     // 15 másodperc
```

### 6. Audit Trail

#### LoginHistory Tábla
- **Minden login kísérlet naplózva** (sikeres + sikertelen)
- **IP address tracking**
- **Failure reason** (User not found, Invalid password, stb.)
- **Compliance**: GDPR, ISO 27001

#### Session Tracking
- **Session létrehozás időpontja**
- **Session lejárata**
- **User-Session kapcsolat** (FK constraint)

### 7. Environment Variables

#### Sensitive Data Protection
```bash
# .env.local (NOT committed to git)
DB_SERVER=localhost\\SQLEXPRESS
DB_DATABASE=AINOVA_DEV
DB_USER=sa
DB_PASSWORD=SecurePassword123!
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Feature flags:
FE_LOGIN_RATE_LIMIT=true
FE_LOGIN_AUDIT=true
FE_LOGIN_FIRST_LOGIN_FORCE=true
```

#### .gitignore
```
.env.local
.env*.local
```

### 8. Error Handling

#### Generic Error Messages
```typescript
// ❌ ROSSZ (information leakage):
return { error: "User 'admin' not found in database" };

// ✅ JÓ (generic message):
return { error: "Hibás felhasználónév vagy jelszó" };
```

#### Internal Logging
```typescript
// Server-side csak:
console.error('[Auth] Login failed:', detailedError);

// Client-side:
return { error: "Bejelentkezés sikertelen" };  // generic
```

### 9. Dependency Security

#### Regular Updates
```bash
npm audit          # Security vulnerabilities check
npm audit fix      # Auto-fix known vulnerabilities
```

#### Trusted Packages Only
- **bcryptjs** - 13M weekly downloads
- **mssql** - 500K weekly downloads
- **next** - 6M weekly downloads

---

## 🔗 Kapcsolatok és Függőségek

### Architektúra Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │            React Components (TSX)                │   │
│  │  • Login UI        • Dashboard UI                │   │
│  │  • Létszám UI      • Admin UI                    │   │
│  └────────────┬────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────┘
                │ HTTP/HTTPS
                │ (fetch API)
                │
┌───────────────▼─────────────────────────────────────────┐
│              NEXT.JS SERVER (Node.js)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         API Routes (Route Handlers)             │   │
│  │  • /api/auth/*     • /api/admin/*               │   │
│  │  • /api/dashboard/*                             │   │
│  └────────────┬────────────────────────────────────┘   │
│               │                                          │
│  ┌────────────▼────────────────────────────────────┐   │
│  │         Business Logic (lib/)                   │   │
│  │  • auth.ts  ───> login()                        │   │
│  │                  validateSession()               │   │
│  │                  logout()                        │   │
│  │  • db.ts    ───> getPool()                      │   │
│  │                  closePool()                     │   │
│  └────────────┬────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────┘
                │ mssql driver
                │ (SQL queries)
                │
┌───────────────▼─────────────────────────────────────────┐
│           SQL SERVER / LocalDB                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Database: AINOVA_DEV                  │   │
│  │  • dbo.Users                                     │   │
│  │  • dbo.Sessions                                  │   │
│  │  • dbo.LoginHistory                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow - Login Példa

```
1. USER ACTION
   ├─> Browser: User kitölti login form-ot
   └─> Event: handleSubmit() triggerelve

2. CLIENT-SIDE VALIDATION
   ├─> InputField: username && password nem üres?
   └─> Ha üres: Toast error, STOP

3. API CALL
   ├─> fetch('/api/auth/login', { method: 'POST', body: {...} })
   └─> Server: POST /api/auth/login handler fogadja

4. SERVER-SIDE VALIDATION
   ├─> Input validation (type, length, empty)
   ├─> Rate limiting check (checkRateLimit())
   └─> Ha fail: Return 4xx error

5. AUTHENTICATION
   ├─> lib/auth.ts: login() függvény hívás
   ├─> lib/db.ts: getPool() → DB connection
   ├─> SQL query: SELECT * FROM Users WHERE Username = @username
   ├─> bcrypt.compare(password, user.PasswordHash)
   └─> Ha fail: Return error, log to LoginHistory

6. SESSION CREATION
   ├─> UUID generálás: crypto.randomUUID()
   ├─> INSERT INTO Sessions (SessionId, UserId, ExpiresAt)
   ├─> HTTP-only cookie: Set-Cookie: sessionId=...
   └─> Return success + user data

7. CLIENT RESPONSE HANDLING
   ├─> Toast: "Sikeres belépés!"
   ├─> sessionStorage.setItem('user', JSON.stringify(user))
   └─> router.push('/dashboard')

8. DASHBOARD LOAD
   ├─> Header: validateSession(sessionId from cookie)
   ├─> SQL query: SELECT * FROM Sessions JOIN Users
   ├─> Cache: sessionCache.set(sessionId, userData)
   └─> Render dashboard UI
```

### Komponens Kapcsolatok

#### Login Flow Komponensek
```
LoginPage
 ├─ uses ─> InteractiveBackground (háttér animáció)
 ├─ uses ─> LoginContainer (form wrapper)
 │   ├─ uses ─> AinovaLogo
 │   ├─ uses ─> InputField (×2: username, password)
 │   └─ uses ─> RippleButton (submit)
 └─ uses ─> ToastNotification (feedback üzenetek)

API Communication:
 └─ fetch ─> POST /api/auth/login
     └─ calls ─> lib/auth.ts::login()
         └─ calls ─> lib/db.ts::getPool()
             └─ connects ─> SQL Server (dbo.Users, dbo.Sessions)
```

#### Dashboard Flow Komponensek
```
DashboardPage
 ├─ uses ─> Header (navigation bar)
 │   └─ calls ─> validateSession() (middleware-like)
 └─ uses ─> MenuTile (×4: modules)
     ├─ Létszám Rögzítés ─> /dashboard/letszam
     ├─ Teljesítmény ─────> /dashboard/teljesitmeny (WIP)
     ├─ Gépadat ──────────> /dashboard/gepadat (WIP)
     └─ Admin Panel ──────> /dashboard/admin
```

#### Létszám Modul Komponensek
```
LetszamPage
 ├─ uses ─> Header
 ├─ uses ─> MuszakSelector (state: selectedMuszak)
 ├─ uses ─> DateSelector (state: selectedDatum)
 ├─ uses ─> LetszamTable (×2)
 │   └─ uses ─> LetszamSummary
 └─ uses ─> KritikusPozicioModal (conditional)

State Dependencies:
 selectedDatum + selectedMuszak ──> useEffect ──> fetchLetszamData()
                                      └─> GET /api/letszam?datum=...&muszak=...

Data Flow:
 handleSave() ──> checkKritikusPoziciok()
   ├─ Has kritikus? ──> Show modal ──> Indoklás ──> saveData()
   └─ No kritikus  ──────────────────────────────> saveData()
       └─> POST /api/letszam (fejlesztés alatt)
```

### External Dependencies Graph

```
ainova-clean (package.json)
 ├── next@16.1.0
 │   ├── react@19.2.3
 │   └── react-dom@19.2.3
 ├── framer-motion@12.23.26
 │   └── react (peer)
 ├── mssql@10.0.0
 │   ├── tedious (SQL Server driver)
 │   └── tarn (connection pooling)
 ├── bcryptjs@2.4.3
 │   └── crypto (Node.js built-in)
 └── tailwindcss@4
     └── postcss (peer)
```

### Database Relationships (Entity-Relationship)

```
┌─────────────────┐
│     Users       │
│─────────────────│
│ UserId (PK)     │◄────────┐
│ Username        │         │
│ PasswordHash    │         │
│ Role            │         │
│ IsActive        │         │
└─────────────────┘         │
                            │
         1                  │ N
         │                  │
         │                  │
┌────────▼────────┐   ┌────┴─────────────┐
│    Sessions     │   │  LoginHistory    │
│─────────────────│   │──────────────────│
│ SessionId (PK)  │   │ LoginId (PK)     │
│ UserId (FK) ────┤   │ UserId (FK) ─────┤
│ CreatedAt       │   │ SessionId        │
│ ExpiresAt       │   │ LoginTime        │
└─────────────────┘   │ Success          │
                      │ FailureReason    │
                      └──────────────────┘

Constraints:
• Sessions.UserId → Users.UserId (ON DELETE CASCADE)
• LoginHistory.UserId → Users.UserId (ON DELETE NO ACTION)
• Sessions.ExpiresAt > SYSDATETIME() → Active sessions only
```

### File Dependencies

#### Core Files
```
lib/db.ts
 └─ imported by ─> lib/auth.ts
                   └─ imported by ─> app/api/auth/*/route.ts
                                     app/api/admin/*/route.ts

components/dashboard/index.ts (barrel file)
 └─ re-exports ─> Header.tsx, MenuTile.tsx
     └─ imported by ─> app/dashboard/page.tsx
                       app/dashboard/letszam/page.tsx
```

#### TypeScript Path Aliases (@/)
```typescript
// tsconfig.json
"paths": {
  "@/*": ["./*"]
}

// Usage examples:
import { getPool } from '@/lib/db';
import { Header } from '@/components/dashboard';
import type { LetszamRow } from '@/components/letszam/types';
```

### Environment Dependencies

```
Development (.env.local)
 ├─> DB_SERVER=localhost\\SQLEXPRESS
 ├─> DB_DATABASE=AINOVA_DEV
 ├─> DB_USER=sa
 ├─> DB_PASSWORD=...
 ├─> FE_LOGIN_RATE_LIMIT=true
 └─> NODE_ENV=development

Production (.env.production)
 ├─> DB_SERVER=prod-sql-server.azure.com
 ├─> DB_ENCRYPT=true
 ├─> DB_TRUST_SERVER_CERTIFICATE=false
 └─> NODE_ENV=production
     └─> Effects:
         ├─> Secure cookies = true (HTTPS-only)
         ├─> Error messages = generic (no details)
         └─> Logging = minimal
```

---

## 🚀 Fejlesztési Roadmap

### Jelenlegi Státusz (v0.1.0)
- ✅ Login/Logout rendszer
- ✅ Session management (HTTP-only cookies)
- ✅ Dashboard főoldal
- ✅ Létszám modul UI (frontend)
- ✅ Admin panel (partial)
- ✅ Rate limiting
- ✅ Audit trail

### Fejlesztés Alatt
- 🚧 Létszám modul backend API
- 🚧 Admin felhasználó kezelés (CRUD)
- 🚧 Teljesítmény modul
- 🚧 Gépadat modul

### Tervezett Funkciók
- 📋 Riportok és grafikonok
- 📋 Email értesítések
- 📋 Export funkció (Excel/PDF)
- 📋 Mobile app (React Native)

---

## 📞 Support & Contact

### Fejlesztő Csapat
- **Projekt tulajdonos**: timetolife1989-cloud
- **Repository**: https://github.com/timetolife1989-cloud/ainova-clean

### Dokumentáció
- **README.md** - Gyors start guide
- **PROJECT_OVERVIEW.md** - Ez a dokumentum (részletes áttekintés)
- **scripts/db-schema.sql** - Adatbázis séma

### Licensz
- **Private repository** - Belső használatra

---

## 📝 Változtatások és Verziókezelés

### Verzió: 0.1.0 (Jelenlegi)
- Alapvető login/logout funkcionalitás
- Dashboard UI (module tiles)
- Létszám modul frontend
- SQL Server integration
- bcrypt password hashing
- Rate limiting
- Audit trail

### Jövőbeni Verziók
- **v0.2.0**: Létszám modul backend + save funkció
- **v0.3.0**: Admin panel (felhasználó CRUD)
- **v0.4.0**: Teljesítmény modul
- **v0.5.0**: Gépadat modul
- **v1.0.0**: Production-ready release

---

**Dokumentáció utoljára frissítve**: 2024-12-28  
**Szerző**: AI Assistant (GitHub Copilot)  
**Célközönség**: Fejlesztők, Projekt Menedzserek, Technikai Dokumentáció
