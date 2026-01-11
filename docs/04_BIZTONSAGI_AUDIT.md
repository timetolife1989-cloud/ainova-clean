# Biztonsági Audit

## 🔒 Összesített Biztonsági Értékelés: ⭐⭐⭐⭐ (4/5)

---

## 1. Autentikáció és Session Kezelés

### 1.1 Jelszó Tárolás ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| bcrypt hash | ✅ | 12 rounds (megfelelő) |
| Plain text támogatás | ❌ | Helyesen elutasítja |
| Salt | ✅ | bcrypt beépített |
| Minimum hossz | ✅ | 8 karakter |
| Komplexitás | ✅ | Nagy/kis betű + szám |

**Kód:**
```typescript
// lib/auth.ts - Jelszó ellenőrzés
if (!user.PasswordHash.startsWith('$2a$') && !user.PasswordHash.startsWith('$2b$')) {
  console.error(`[Auth] SECURITY: Invalid password hash format for user ${username}`);
  return { success: false, error: 'Jelszavát frissíteni kell.' };
}
```

---

### 1.2 Session Kezelés ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| UUID v4 session ID | ✅ | randomUUID() |
| HTTP-only cookie | ✅ | Implementálva |
| Secure flag | ✅ | HTTPS only |
| SameSite | ⚠️ | Nincs explicit beállítva |
| Lejárat | ✅ | 24 óra |
| Session invalidáció | ✅ | Logout törli |

**Kód:**
```typescript
// app/api/auth/login/route.ts
response.cookies.set('sessionId', result.sessionId!, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',  // Javasolt hozzáadás
  maxAge: 60 * 60 * 24,  // 24 óra
  path: '/',
});
```

**Javítandó:**
```typescript
// Javasolt kiegészítés:
sameSite: 'strict',  // CSRF védelem erősítése
```

---

### 1.3 Rate Limiting ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Bejelentkezés limit | ✅ | 5 próba / 15 perc |
| IP alapú | ✅ | Implementálva |
| DB tárolás | ✅ | LoginHistory táblában |
| In-memory fallback | ✅ | Ha DB nem elérhető |
| Multi-instance sync | ❌ | Hiányzik (Redis kellene) |

**Probléma:**
Multi-instance deployment esetén az in-memory rate limit nem szinkronizált:
- 3 szerver instance = 15 próba (3×5) az 5 helyett

**Javítás:**
```typescript
// Redis-alapú rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
});
```

---

## 2. SQL Injection Védelem

### Értékelés: ⭐⭐⭐⭐⭐ (5/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Paraméteres lekérdezések | ✅ | Mindenhol használt |
| Input validáció | ✅ | Típusellenőrzés |
| ORM használat | ❌ | Raw SQL, de biztonságos |

**Jó példa:**
```typescript
// lib/auth.ts - Paraméteres query
const userResult = await pool
  .request()
  .input('username', sql.NVarChar(100), username)
  .query(`
    SELECT UserId, Username, PasswordHash, FullName, Role, FirstLogin, IsActive
    FROM dbo.AinovaUsers
    WHERE Username = @username
  `);
```

**Potenciális kockázat (de biztonságos):**
```typescript
// app/api/admin/users/route.ts
const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
// A conditions tömb csak előre definiált stringeket tartalmaz, nincs user input
```

---

## 3. XSS (Cross-Site Scripting) Védelem

### Értékelés: ⭐⭐⭐⭐ (4/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| React JSX escape | ✅ | Automatikus |
| dangerouslySetInnerHTML | ✅ | Nincs használva |
| Input sanitization | ⚠️ | Nincs explicit |
| Content-Security-Policy | ❌ | Hiányzik |

**Javítandó - CSP header hozzáadása:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};
```

---

## 4. CSRF (Cross-Site Request Forgery) Védelem

### Értékelés: ⭐⭐ (2/5) ⚠️ KRITIKUS

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| CSRF token | ❌ | Nincs implementálva |
| SameSite cookie | ⚠️ | 'lax' (nem 'strict') |
| Origin ellenőrzés | ❌ | Hiányzik |

**Probléma:**
A POST/PATCH/DELETE API endpointok nem védettek CSRF támadás ellen.

**Támadási szcenárió:**
1. Felhasználó bejelentkezett az AINOVA-ba
2. Meglátogat egy rosszindulatú weboldalt
3. Az oldal JavaScript-tel POST kérést küld az AINOVA-nak
4. A böngésző automatikusan csatolja a session cookie-t
5. A támadó műveleteket hajt végre a felhasználó nevében

**Javítás implementáció:**

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export async function setCSRFCookie(response: Response): Promise<void> {
  const token = generateCSRFToken();
  response.headers.append('Set-Cookie', `csrf=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`);
}

export async function validateCSRF(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('csrf')?.value;
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return cookieToken === headerToken;
}
```

**Frontend használat:**
```typescript
// Fetch hívásokhoz
const csrfToken = document.cookie.match(/csrf=([^;]+)/)?.[1];

fetch('/api/admin/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  },
  body: JSON.stringify(data),
});
```

---

## 5. Hozzáférés Vezérlés (Authorization)

### Értékelés: ⭐⭐⭐ (3/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Session validáció | ✅ | Minden API-ban |
| Role-based access | ⚠️ | Részleges |
| Admin re-auth | ✅ | Admin panelhez |
| Resource ownership | ⚠️ | Nincs ellenőrizve |

**Probléma:**
Nincs központosított role-based access control (RBAC).

**Jelenlegi állapot:**
```typescript
// Minden route-ban manuális ellenőrzés
const session = await checkSession(request);
if (!session.valid) return session.response;
// DE: nincs role ellenőrzés!
```

**Javítás - Middleware RBAC:**
```typescript
// lib/rbac.ts
type Role = 'Admin' | 'Manager' | 'Műszakvezető' | 'Operátor';

const PERMISSIONS: Record<string, Role[]> = {
  'admin.users.read': ['Admin', 'Manager'],
  'admin.users.write': ['Admin'],
  'admin.users.delete': ['Admin'],
  'letszam.write': ['Admin', 'Manager', 'Műszakvezető'],
  'teljesitmeny.read': ['Admin', 'Manager', 'Műszakvezető', 'Operátor'],
};

export function hasPermission(userRole: Role, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles?.includes(userRole) ?? false;
}

// API route-ban:
export async function POST(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  
  if (!hasPermission(session.role as Role, 'admin.users.write')) {
    return ApiErrors.forbidden();
  }
  // ...
}
```

---

## 6. Input Validáció

### Értékelés: ⭐⭐⭐⭐ (4/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Null/undefined check | ✅ | Implementálva |
| Type check | ✅ | typeof ellenőrzés |
| Length limits | ✅ | DoS védelem |
| Regex validáció | ✅ | Email, username |
| Whitelist validáció | ✅ | Role, shift |

**Jó példa:**
```typescript
// app/api/auth/login/route.ts
if (typeof username !== 'string' || typeof password !== 'string') {
  return NextResponse.json({ success: false, error: 'Érvénytelen bemenet formátum' }, { status: 400 });
}

if (trimmedUsername.length > 100) {
  return NextResponse.json({ success: false, error: 'A felhasználónév túl hosszú' }, { status: 400 });
}
```

**Javítandó - Zod séma központosítása:**
```typescript
// lib/schemas/auth.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1).max(100).trim(),
  password: z.string().min(1).max(500),
});

// API route-ban:
const result = LoginSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.message }, { status: 400 });
}
```

---

## 7. Audit Logging

### Értékelés: ⭐⭐⭐⭐ (4/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Login attempts | ✅ | LoginHistory tábla |
| IP logging | ✅ | Implementálva |
| Failure reasons | ✅ | Tárolt |
| Admin actions | ⚠️ | Hiányzik |
| Data changes | ❌ | Nincs audit trail |

**Javítandó - Admin action logging:**
```sql
CREATE TABLE dbo.AuditLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Action NVARCHAR(100) NOT NULL,  -- 'user.create', 'user.update', 'user.delete'
    TargetType NVARCHAR(50),        -- 'User', 'Operator', 'Letszam'
    TargetId INT,
    OldValue NVARCHAR(MAX),         -- JSON
    NewValue NVARCHAR(MAX),         -- JSON
    IPAddress NVARCHAR(50),
    CreatedAt DATETIME2 DEFAULT SYSDATETIME()
);
```

---

## 8. Adatbázis Biztonság

### Értékelés: ⭐⭐⭐⭐ (4/5)

| Követelmény | Státusz | Megjegyzés |
|-------------|---------|------------|
| Encrypted connection | ✅ | TLS enabled |
| Least privilege | ⚠️ | Nem ellenőrzött |
| Connection pooling | ✅ | Implementálva |
| Graceful shutdown | ✅ | Implementálva |
| Env var protection | ⚠️ | Nincs titkosítás |

**Javítandó - Azure Key Vault vagy környezeti változó titkosítás:**
```typescript
// Jelenleg plain text .env.local:
DB_PASSWORD=plaintext_password

// Javasolt: Azure Key Vault
import { SecretClient } from '@azure/keyvault-secrets';
const client = new SecretClient(vaultUrl, credential);
const dbPassword = await client.getSecret('db-password');
```

---

## Összefoglaló - Biztonsági Prioritások

| # | Probléma | Súlyosság | Prioritás | Becsült idő |
|---|----------|-----------|-----------|-------------|
| 1 | CSRF védelem hiányzik | 🔴 Kritikus | P0 | 4 óra |
| 2 | CSP header hiányzik | 🟡 Közepes | P1 | 1 óra |
| 3 | RBAC központosítás | 🟡 Közepes | P1 | 8 óra |
| 4 | Admin audit log | 🟢 Alacsony | P2 | 4 óra |
| 5 | Multi-instance rate limit | 🟡 Közepes | P2 | 4 óra |
| 6 | Env var titkosítás | 🟢 Alacsony | P3 | 8 óra |

---

## Checklist a Production Deployment Előtt

- [ ] CSRF token implementálva és tesztelve
- [ ] CSP header konfigurálva
- [ ] SameSite=Strict a session cookie-n
- [ ] RBAC middleware minden admin route-on
- [ ] Rate limiting tesztelve
- [ ] Audit logging minden admin műveletre
- [ ] HTTPS kötelező (no HTTP fallback)
- [ ] Error message-ek nem fednek fel belső infót
- [ ] SQL injection tesztek futtatva
- [ ] Dependency audit (`npm audit`)

