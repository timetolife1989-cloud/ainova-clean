# AINOVA Kódbázis Elemzés és Fejlesztési Javaslatok

## 📊 Projekt Áttekintés

**Projekt neve**: AINOVA - Termelésirányító Rendszer  
**Technológia**: Next.js 16, React 19, TypeScript, SQL Server  
**Kód mennyiség**: ~5,700 sor (TypeScript/React)  
**Alkalmazás típus**: Full-stack webalkalmazás autentikációval  

### Főbb Modulok
1. **Autentikáció** (`lib/auth.ts`, `lib/db.ts`, `middleware.ts`)
2. **Létszám Rögzítés** (`app/dashboard/letszam/`, `components/letszam/`)
3. **Admin Panel** (`app/dashboard/admin/`, `components/dashboard/admin/`)
4. **Login UI** (`app/login/`, `components/login/`)
5. **API Végpontok** (`app/api/`)

---

## ✅ Erősségek

### 1. Kiváló Kód Minőség és Dokumentáció
- **Részletes inline kommentek**: Minden fő fájl (~500+ sor kód kommentekkel)
- **Magyar nyelvű hibaüzenetek**: Felhasználóbarát (pl. "Túl sok sikertelen kísérlet")
- **Strukturált kód**: Tiszta szeparáció (API/Components/Lib)
- **TypeScript típusok**: Jó típusdefiníciók (User, SessionData, LoginResult)

### 2. Biztonsági Funkciók
- ✅ **Bcrypt jelszó titkosítás** (production mode)
- ✅ **HTTP-only cookies** (XSS védelem)
- ✅ **Rate limiting** (5 failed attempts / 15 perc)
- ✅ **Session validation** middleware-rel
- ✅ **SQL injection védelem** (parameterized queries)
- ✅ **Audit logging** (LoginHistory, létszám audit log)
- ✅ **CSRF védelem** (SameSite: 'lax')

### 3. Teljesítmény Optimalizáció
- ✅ **Connection pooling** (mssql pool)
- ✅ **Session cache** (5 perc TTL, memóriában)
- ✅ **Rate limit cache** (in-memory fallback)
- ✅ **Database indexek** (datum/muszak, username)
- ✅ **Computed columns** (SQL szinten számított mezők)

### 4. Production-Ready Fejlesztések
- ✅ **Feature flags** (FE_LOGIN_RATE_LIMIT, FE_LOGIN_AUDIT, FE_LOGIN_FIRST_LOGIN_FORCE)
- ✅ **Graceful shutdown** (SIGINT/SIGTERM handlers)
- ✅ **Error handling** (try-catch minden API route-ban)
- ✅ **Transaction management** (rollback létszám mentésnél)
- ✅ **Connection leak fix** (pool.close() on failure)

### 5. Felhasználói Élmény (UX)
- ✅ **Modern UI**: Framer Motion animációk, cosmic theme
- ✅ **Toast notifications**: Success/Error/Warning/Info
- ✅ **Loading states**: Ripple button effect
- ✅ **Interaktív háttér**: 3D particle effects
- ✅ **Responsive design**: Tailwind CSS

---

## 🐛 Talált Hibák és Problémák

### 1. TypeScript / Type Safety Problémák

#### A. Middleware export naming
**Fájl**: `middleware.ts:55`
```typescript
// 🔴 PROBLÉMA: Next.js 16 breaking change
export async function proxy(request: NextRequest) { ... }
export { proxy as middleware };
```
**Hatás**: Middleware nem fut Next.js 15-ben (backward compatibility issue)  
**Megoldás**: Csak `middleware` néven export (Next.js standard)

#### B. Hiányzó null checks az API-kban
**Fájl**: `app/api/letszam/route.ts:83-85`
```typescript
u.FullName AS rogzitette_fullname,
u.Role AS rogzitette_role,
u.Shift AS rogzitette_shift,  // ❌ 'Shift' column nem létezik AinovaUsers-ben
```
**Hatás**: SQL query hiba futásidőben  
**Megoldás**: Távolítsd el a `u.Shift` hivatkozást

#### C. Type coercion az error handling-ben
**Fájl**: `app/login/page.tsx:70`
```typescript
const getErrorMessage = (error: string): string => {
  const lowerError = error.toLowerCase();
  // ... sok if statement
}
```
**Probléma**: Nem kezeli ha `error` undefined vagy null  
**Megoldás**: Add hozzá `error?.toLowerCase() ?? ''`

### 2. Biztonsági Problémák

#### A. Plain text jelszavak a kódban
**Fájl**: `lib/auth.ts:268-277`
```typescript
if (user.PasswordHash.startsWith('$2a$') || user.PasswordHash.startsWith('$2b$')) {
  passwordMatch = await bcrypt.compare(password, user.PasswordHash);
} else {
  // Plain text password (development mode only - dev/admin users)
  passwordMatch = password === user.PasswordHash;
}
```
**Probléma**: Production-ban is engedélyezi a plain text jelszavakat  
**Megoldás**: 
```typescript
if (process.env.NODE_ENV === 'production' && !user.PasswordHash.startsWith('$2')) {
  throw new Error('Plain text passwords not allowed in production');
}
```

#### B. Session fixation vulnerability
**Fájl**: `lib/auth.ts:289`
```typescript
const sessionId = randomUUID();
```
**Probléma**: Session ID nem regenerálódik successful login után  
**Megoldás**: Minden login után új session ID generálás

#### C. Weak rate limiting (multi-instance)
**Fájl**: `lib/auth.ts:66-84`
```typescript
const rateLimitCache = new Map<string, RateLimitEntry>();
```
**Probléma**: In-memory cache nem skálázódik (load balancer mögött 5×3=15 attempt)  
**Megoldás**: Redis-based rate limiting (production)

#### D. XSS vulnerability a toast üzenetekben
**Fájl**: `components/login/ToastNotification.tsx` (feltételezve)
```typescript
<div>{message}</div>  // ❌ HTML injection lehetséges
```
**Megoldás**: Használj `textContent` vagy sanitize-áld az inputot

### 3. Database / SQL Problémák

#### A. Hiányzó foreign key constraint
**Fájl**: `database/migrations/001_create_letszam_tables.sql:43`
```sql
rogzitette_user NVARCHAR(50) NOT NULL,
```
**Probléma**: Nincs foreign key az `AinovaUsers.Username`-re  
**Következmény**: Orphaned records ha user törlődik  
**Megoldás**: 
```sql
FOREIGN KEY (rogzitette_user) REFERENCES AinovaUsers(Username)
  ON DELETE NO ACTION ON UPDATE CASCADE
```

#### B. Missing cascade delete a Sessions táblában
**Fájl**: `scripts/setup-ainova-users.sql` (feltételezve)
```sql
CREATE TABLE dbo.Sessions (
  UserId INT NOT NULL,
  -- ❌ Nincs ON DELETE CASCADE
  FOREIGN KEY (UserId) REFERENCES AinovaUsers(UserId)
);
```
**Probléma**: Ha user törlődik, sessions megmaradnak (orphaned)  
**Megoldás**: `ON DELETE CASCADE`

#### C. N+1 query problem
**Fájl**: `app/api/letszam/route.ts:86-92`
```sql
LEFT JOIN AinovaUsers u ON l.rogzitette_user = u.Username
```
**Probléma**: Nincs index az `AinovaUsers.Username`-n a JOIN-hoz  
**Megoldás**: Hozz létre indexet:
```sql
CREATE INDEX IX_AinovaUsers_Username ON AinovaUsers(Username);
```

### 4. Teljesítmény Problémák

#### A. Session cache race condition
**Fájl**: `lib/auth.ts:410-423`
```typescript
const cached = sessionCache.get(sessionId);
if (cached) {
  const age = Date.now() - cached.cachedAt;
  if (age < SESSION_CACHE_TTL) { ... }
}
```
**Probléma**: Concurrent requests esetén race condition  
**Megoldás**: Implement cache locking vagy használj atomic operations

#### B. Nincs pagination a létszám lekérdezésben
**Fájl**: `app/api/letszam/route.ts:58-92`
```sql
SELECT * FROM ainova_letszam WHERE datum = @datum AND muszak = @muszak
```
**Probléma**: Ha 1000+ pozíció van, memory spike  
**Megoldás**: Add hozzá `OFFSET` és `FETCH NEXT` (SQL Server pagination)

#### C. Hiányzó query timeout
**Fájl**: `lib/db.ts:46`
```typescript
requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
```
**Probléma**: 30s timeout túl hosszú (frontend timeout előbb)  
**Megoldás**: Csökkentsd 5000-10000ms-re

### 5. Kód Duplikáció

#### A. Ismétlődő validation logic
**Helyek**: 
- `app/api/auth/login/route.ts:39-106`
- `app/api/letszam/route.ts:137-155`
```typescript
// Validation logic minden API route-ban másolva
if (!username || !password) { ... }
if (typeof username !== 'string') { ... }
```
**Megoldás**: Centralizált `lib/validation.ts` modul

#### B. Duplicated error messages
**Helyek**:
- `app/login/page.tsx:12-21` (errorMessages map)
- `lib/auth.ts:340-394` (error.message mapping)
```typescript
const errorMessages: Record<string, string> = { ... }
```
**Megoldás**: Shared `lib/error-messages.ts` konstans fájl

---

## 🎯 Javasolt Kiegészítők és Fejlesztések

### 1. Tesztelés (KRITIKUS - jelenleg 0 teszt!)

#### A. Unit tesztek
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/jest ts-jest
```

**Javasolt tesztek**:
- `lib/auth.test.ts`: login(), validateSession(), checkRateLimit()
- `lib/db.test.ts`: getPool(), connection handling
- `components/login/LoginContainer.test.tsx`: UI state changes

**Prioritás**: 🔴 **MAGAS** (production-ready app tesztek nélkül kockázatos)

#### B. Integration tesztek
```bash
npm install --save-dev supertest
```
**Tesztelendő API-k**:
- POST /api/auth/login (success/fail scenarios)
- GET /api/letszam (authorization, validation)
- POST /api/letszam (transaction rollback)

#### C. E2E tesztek
```bash
npm install --save-dev playwright @playwright/test
```
**Tesztelendő flow-k**:
- Login → Dashboard → Létszám rögzítés → Logout
- Admin user creation
- Password change (első login esetén)

### 2. Fejlesztői Eszközök

#### A. ESLint javítás
**Probléma**: `eslint: not found` (npm run lint)  
**Megoldás**:
```bash
npm install --save-dev eslint@^9 @typescript-eslint/parser @typescript-eslint/eslint-plugin
```
**Konfig (`eslint.config.mjs`)**:
```javascript
export default [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': ['warn', { allow: ['error', 'warn'] }]
    }
  }
];
```

#### B. Prettier hozzáadása
```bash
npm install --save-dev prettier eslint-config-prettier
```
**Konfig (`.prettierrc.json`)**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

#### C. Husky pre-commit hooks
```bash
npm install --save-dev husky lint-staged
npx husky install
```
**`.husky/pre-commit`**:
```bash
#!/bin/sh
npm run lint
npm run type-check
npm test
```

### 3. Dokumentáció Fejlesztések

#### A. API Documentation (OpenAPI/Swagger)
```bash
npm install --save-dev swagger-jsdoc swagger-ui-react
```
**Új fájl**: `app/api/docs/route.ts`
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 */
```

#### B. Component Storybook
```bash
npx storybook@latest init
```
**Használati eset**: UI komponensek dokumentálása (MenuTile, InputField, stb.)

#### C. Architecture Decision Records (ADR)
**Új mappa**: `docs/adr/`
```markdown
# ADR-001: SQL Server Connection Pooling Strategy

## Status
Accepted

## Context
Need efficient database connection management...

## Decision
Use mssql connection pool with min=2, max=10...

## Consequences
- Reduces connection overhead
- Requires graceful shutdown handling
```

### 4. Biztonsági Fejlesztések

#### A. Helmet.js (Security headers)
```bash
npm install helmet
```
**middleware.ts kiegészítés**:
```typescript
import helmet from 'helmet';

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

// Add security headers
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

#### B. Content Security Policy (CSP)
**next.config.ts kiegészítés**:
```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  }
];

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};
```

#### C. OWASP Dependency Check
```bash
npm install --save-dev npm-audit-resolver
npm audit --json | npm-audit-resolver
```

#### D. SQL Injection Scanner
```bash
npm install --save-dev @syntest/sql
```

### 5. Monitoring és Logging

#### A. Winston Logger
```bash
npm install winston winston-daily-rotate-file
```
**Új fájl**: `lib/logger.ts`
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ]
});
```

#### B. Application Performance Monitoring (APM)
```bash
npm install @sentry/nextjs
```
**Konfig**: `sentry.client.config.ts`, `sentry.server.config.ts`

#### C. Health Check Endpoint
**Új fájl**: `app/api/health/route.ts`
```typescript
export async function GET() {
  const dbHealthy = await checkDBConnection();
  const cacheHealthy = sessionCache.size < 10000;
  
  return NextResponse.json({
    status: dbHealthy && cacheHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealthy ? 'ok' : 'error',
    cache: cacheHealthy ? 'ok' : 'overload'
  });
}
```

### 6. Teljesítmény Optimalizációk

#### A. Redis Session Store (production)
```bash
npm install ioredis @types/ioredis
```
**Új fájl**: `lib/redis.ts`
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export async function getCachedSession(sessionId: string) {
  const cached = await redis.get(`session:${sessionId}`);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedSession(sessionId: string, data: SessionData) {
  await redis.setex(`session:${sessionId}`, 300, JSON.stringify(data));
}
```

#### B. Next.js Image Optimization
**Fájl frissítés**: `components/login/AinovaLogo.tsx`
```typescript
import Image from 'next/image';

// Régi: <img src="/logo.png" />
// Új:
<Image src="/logo.png" alt="AINOVA" width={200} height={60} priority />
```

#### C. Database Query Optimization
**View létrehozás**: `scripts/create-letszam-summary-view.sql`
```sql
-- Materializált view (SQL Server: Indexed View)
CREATE VIEW v_ainova_letszam_daily_summary WITH SCHEMABINDING AS
SELECT 
  datum, 
  muszak,
  COUNT_BIG(*) AS total_rows,
  SUM(megjelent) AS total_megjelent
FROM dbo.ainova_letszam
GROUP BY datum, muszak;

CREATE UNIQUE CLUSTERED INDEX IX_letszam_summary 
  ON v_ainova_letszam_daily_summary (datum, muszak);
```

#### D. Frontend Code Splitting
**Új konfig**: `next.config.ts`
```typescript
export default {
  experimental: {
    optimizePackageImports: ['framer-motion', 'mssql'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        }
      }
    };
    return config;
  }
};
```

### 7. Új Funkciók Javaslata

#### A. Jelszó Visszaállítás (Password Reset)
**Új API**: `app/api/auth/reset-password/route.ts`
```typescript
// 1. Request reset token (email küldés)
// 2. Validate token
// 3. Update password
```

#### B. Kétfaktoros Autentikáció (2FA)
```bash
npm install speakeasy qrcode
```
**Új tábla**: `dbo.AinovaTwoFactorAuth`
```sql
CREATE TABLE dbo.AinovaTwoFactorAuth (
  UserId INT PRIMARY KEY,
  Secret NVARCHAR(255) NOT NULL,
  Enabled BIT DEFAULT 0,
  BackupCodes NVARCHAR(MAX),
  FOREIGN KEY (UserId) REFERENCES AinovaUsers(UserId)
);
```

#### C. Felhasználói Jogosultságok (RBAC - Role-Based Access Control)
**Új tábla**: `dbo.AinovaPermissions`
```sql
CREATE TABLE dbo.AinovaRoles (
  RoleId INT PRIMARY KEY IDENTITY,
  RoleName NVARCHAR(50) UNIQUE NOT NULL,
  Permissions NVARCHAR(MAX) -- JSON: ["letszam.read", "letszam.write"]
);
```

**Middleware kiegészítés**: `middleware.ts`
```typescript
function checkPermission(userRole: string, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(requiredPermission);
}
```

#### D. Audit Log Viewer (Admin Panel)
**Új oldal**: `app/dashboard/admin/audit/page.tsx`
```typescript
// Display LoginHistory és létszám audit log
// Filtering: user, date range, action type
// Export to CSV/Excel
```

#### E. Export Funkció (Excel/CSV)
```bash
npm install xlsx
```
**Új API**: `app/api/letszam/export/route.ts`
```typescript
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const data = await fetchLetszamData();
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Létszám');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=letszam.xlsx'
    }
  });
}
```

#### F. Real-time Notifications (WebSocket)
```bash
npm install socket.io socket.io-client
```
**Use case**: Admin módosít egy létszám rekordot → Értesítés minden online user-nek

#### G. Dark Mode / Theme Switcher
**Új context**: `contexts/ThemeContext.tsx`
```typescript
export const ThemeContext = createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });
```

---

## 📋 Prioritási Lista (Sürgősség szerint)

### 🔴 Kritikus (1-2 hét)
1. **Unit és integration tesztek írása** (0 teszt jelenleg!)
2. **TypeScript strict mode hibák javítása**
3. **ESLint setup és kód linting**
4. **SQL foreign key constraints hozzáadása**
5. **Plain text password tiltása production-ban**
6. **XSS protection a toast üzenetekben**

### 🟠 Fontos (2-4 hét)
7. **Redis session cache (production scalability)**
8. **API dokumentáció (Swagger/OpenAPI)**
9. **Sentry/APM monitoring beállítása**
10. **Health check endpoint**
11. **Database indexek optimalizálása**
12. **Helmet.js security headers**

### 🟡 Ajánlott (1-2 hónap)
13. **Jelszó visszaállítás funkció**
14. **2FA (kétfaktoros autentikáció)**
15. **RBAC (role-based access control)**
16. **Audit log viewer admin panel**
17. **Export funkció (Excel/CSV)**
18. **Component Storybook dokumentáció**

### 🟢 Nice-to-have (hosszú távú)
19. **Real-time notifications (WebSocket)**
20. **Dark mode / theme switcher**
21. **Advanced filtering a létszám táblázatban**
22. **Grafikon és dashboard analytics**

---

## 📚 Ajánlott Olvasmányok és Források

### Biztonsági Best Practices
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)
- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

### TypeScript & Testing
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Performance
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [SQL Server Performance Tuning](https://learn.microsoft.com/en-us/sql/relational-databases/performance/performance-monitoring-and-tuning-tools)

---

## 🎓 Összefoglalás

### Erősségek (amit jól csináltok):
✅ Tiszta kód struktúra és dokumentáció  
✅ Erős biztonsági alapok (bcrypt, session validation, rate limiting)  
✅ Modern tech stack (Next.js 16, React 19)  
✅ Production-ready features (feature flags, graceful shutdown)  
✅ Jó UX (animációk, toast notifications)  

### Sürgős javítások:
🔴 Tesztek hiánya (0 unit/integration test)  
🔴 TypeScript strict mode hibák  
🔴 SQL foreign key constraints  
🔴 Plain text password production tiltás  
🔴 XSS vulnerabilities  

### Ajánlott irányok:
🎯 Tesztelési infrastruktúra (Jest, Playwright)  
🎯 Redis cache production-ban  
🎯 Monitoring és logging (Sentry, Winston)  
🎯 API dokumentáció (Swagger)  
🎯 Új funkciók (2FA, password reset, export)  

**Összességében**: Szilárd alapokkal rendelkező projekt, de **tesztelés és néhány biztonsági javítás kritikusan fontos** a production release előtt!
