# Fejlesztendő Területek - Prioritási Lista

## 🚨 KRITIKUS (P0) - Azonnal javítandó

### 1. CSRF Védelem Hiányzik
**Értékelés: ⭐⭐ (2/5)**
**Fájlok:** `app/api/**/route.ts`

**Probléma:**
A POST/PATCH/DELETE endpointok nem ellenőrzik a CSRF tokent. Ez lehetővé teszi Cross-Site Request Forgery támadásokat.

**Javítás:**
```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(request: NextRequest, token: string): boolean {
  const headerToken = request.headers.get('x-csrf-token');
  return headerToken === token;
}
```

**Hol implementálni:**
- Minden POST/PATCH/DELETE API route-ban
- Login form-ban token generálás
- Frontend fetch hívásoknál header hozzáadása

---

### 2. Input Validation Middleware Hiányzik
**Értékelés: ⭐⭐⭐ (3/5)**
**Fájlok:** `app/api/**/route.ts`

**Probléma:**
Minden API route manuálisan validálja a bemenetet. Ez duplikációhoz és hibalehetőségekhez vezet.

**Jelenlegi állapot:**
```typescript
// Minden route-ban ismétlődik:
if (!data.username || !data.name || !data.password) {
  return NextResponse.json({ error: '...' }, { status: 400 });
}
```

**Javítás - Zod séma validáció:**
```typescript
// lib/validators/schemas.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(100),
  name: z.string().min(2).max(200),
  password: z.string().min(8).regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  role: z.enum(['Admin', 'Manager', 'Műszakvezető', 'Operátor']),
  shift: z.enum(['A', 'B', 'C']).nullable(),
});

// API route-ban:
const result = CreateUserSchema.safeParse(body);
if (!result.success) {
  return apiError(result.error.message, 400);
}
```

**Telepítés szükséges:**
```bash
npm install zod
```

---

### 3. SQL Injection Védelem Megerősítése
**Értékelés: ⭐⭐⭐⭐ (4/5)**
**Fájlok:** `app/api/admin/users/route.ts`, `app/api/teljesitmeny/route.ts`

**Probléma:**
Bár paraméterezett lekérdezések vannak, néhány helyen dinamikus SQL építés történik string concatenation-nel.

**Kockázatos kód:**
```typescript
// app/api/admin/users/route.ts - 87. sor
const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
```

**Javítás:**
A `conditions` tömb már biztonságos (paraméteres), de érdemes egy whitelist-et használni a mezőnevekre:

```typescript
const ALLOWED_FILTER_FIELDS = ['Role', 'Shift', 'IsActive', 'Username', 'FullName'];

function sanitizeFieldName(field: string): string {
  if (!ALLOWED_FILTER_FIELDS.includes(field)) {
    throw new Error('Invalid filter field');
  }
  return field;
}
```

---

## ⚠️ MAGAS PRIORITÁS (P1) - 1 héten belül

### 4. Unit Tesztek Hiányoznak
**Értékelés: ⭐ (1/5)**
**Fájlok:** Nincs `__tests__` mappa

**Probléma:**
Egyáltalán nincsenek automatizált tesztek. Ez kockázatos éles rendszernél.

**Javítás - Jest + Testing Library:**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
```

**Minimális teszt fájlok létrehozása:**
```
__tests__/
├── lib/
│   ├── auth.test.ts          # Autentikáció tesztek
│   ├── validators.test.ts    # Validátor tesztek
│   └── db.test.ts            # DB kapcsolat tesztek
├── api/
│   ├── login.test.ts         # Login API teszt
│   └── users.test.ts         # Users CRUD teszt
└── components/
    ├── LoginForm.test.tsx    # Login form teszt
    └── Header.test.tsx       # Header komponens teszt
```

---

### 5. Error Boundary Hiányzik
**Értékelés: ⭐⭐ (2/5)**
**Fájlok:** `app/layout.tsx`, `app/dashboard/layout.tsx`

**Probléma:**
Ha egy komponens hibát dob, az egész alkalmazás összeomlik.

**Javítás:**
```tsx
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h2 className="text-xl text-red-500 mb-4">Hiba történt</h2>
        <p className="text-slate-400 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Újrapróbálkozás
        </button>
      </div>
    </div>
  );
}
```

---

### 6. Environment Variable Validáció
**Értékelés: ⭐⭐⭐ (3/5)**
**Fájlok:** `lib/db.ts`

**Probléma:**
Ha hiányoznak a környezeti változók, az alkalmazás runtime-ban bukik el.

**Javítás - env.mjs fájl:**
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DB_SERVER: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_PORT: z.string().default('1433'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

---

## 📌 KÖZEPES PRIORITÁS (P2) - 2-4 héten belül

### 7. Rate Limiting Redis-szel
**Értékelés: ⭐⭐⭐ (3/5)**
**Fájlok:** `lib/auth.ts`

**Jelenlegi állapot:**
In-memory rate limiting van, ami nem működik több szerver instance esetén.

**Javítás:**
```bash
npm install ioredis @upstash/ratelimit
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
});

export async function checkRateLimit(ip: string) {
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

---

### 8. Logging Rendszer
**Értékelés: ⭐⭐ (2/5)**
**Fájlok:** Mindenhol `console.log/error` van használva

**Probléma:**
Nincs strukturált logging, nehéz a hibakeresés production-ben.

**Javítás - Winston/Pino:**
```bash
npm install pino pino-pretty
```

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Használat:
logger.info({ userId, action: 'login' }, 'User logged in');
logger.error({ error, stack: error.stack }, 'Database error');
```

---

### 9. API Response Caching
**Értékelés: ⭐⭐⭐ (3/5)**
**Fájlok:** `app/api/teljesitmeny/route.ts`, `app/api/letszam/route.ts`

**Probléma:**
Minden lekérdezés az adatbázishoz megy, nincs cache.

**Javítás - Next.js unstable_cache:**
```typescript
import { unstable_cache } from 'next/cache';

const getTeljesitmenyData = unstable_cache(
  async (type: string, muszak: string) => {
    // DB lekérdezés
    return data;
  },
  ['teljesitmeny-data'],
  { revalidate: 300 } // 5 perc
);
```

---

### 10. Komponens Méret Csökkentése
**Értékelés: ⭐⭐⭐ (3/5)**
**Fájlok:** 
- `app/dashboard/letszam/page.tsx` (738 sor)
- `app/dashboard/teljesitmeny/page.tsx` (479 sor)

**Probléma:**
Túl nagy komponensek, nehéz karbantartani.

**Javítás:**
Bontsd szét a logikát custom hook-okba:

```typescript
// hooks/useLetszamForm.ts
export function useLetszamForm() {
  const [data, setData] = useState<StaffData>(initializeStaffData);
  // ... összes form logika
  return { data, handleChange, handleSubmit, errors };
}

// app/dashboard/letszam/page.tsx
export default function LetszamPage() {
  const { data, handleChange, handleSubmit } = useLetszamForm();
  // Csak renderelés
}
```

---

## 📋 ALACSONY PRIORITÁS (P3) - Hosszú távon

### 11. Dark/Light Mode Toggle
**Értékelés:** Jelenleg nincs

### 12. PWA Támogatás
**Értékelés:** Jelenleg nincs

### 13. Internationalization (i18n)
**Értékelés:** Jelenleg hardcoded magyar szövegek

### 14. Accessibility (a11y)
**Értékelés:** Részleges - ARIA labelek hiányoznak sok helyen

### 15. E2E Tesztek (Playwright/Cypress)
**Értékelés:** Nincs implementálva

---

## Összefoglaló Táblázat

| # | Terület | Jelenlegi | Cél | Prioritás |
|---|---------|-----------|-----|-----------|
| 1 | CSRF védelem | ⭐⭐ | ⭐⭐⭐⭐⭐ | P0 |
| 2 | Input validáció | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P0 |
| 3 | SQL védelem | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P0 |
| 4 | Unit tesztek | ⭐ | ⭐⭐⭐⭐ | P1 |
| 5 | Error boundary | ⭐⭐ | ⭐⭐⭐⭐⭐ | P1 |
| 6 | Env validáció | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P1 |
| 7 | Redis rate limit | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P2 |
| 8 | Strukturált logging | ⭐⭐ | ⭐⭐⭐⭐ | P2 |
| 9 | API caching | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | P2 |
| 10 | Komponens méret | ⭐⭐⭐ | ⭐⭐⭐⭐ | P2 |

