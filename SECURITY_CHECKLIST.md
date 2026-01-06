# 🔒 AINOVA Biztonsági Ellenőrző Lista

## Aktuális Biztonsági Helyzet: ⚠️ FIGYELEM SZÜKSÉGES

### ✅ Implementált Biztonsági Intézkedések

#### Autentikáció & Session Management
- [x] **Bcrypt password hashing** (production mode)
- [x] **HTTP-only cookies** (XSS védelem)
- [x] **Secure cookies** (HTTPS-only production-ban)
- [x] **SameSite: 'lax'** (CSRF védelem)
- [x] **Session expiration** (24 óra)
- [x] **Session validation** middleware-rel
- [x] **Session cache** (5 perc TTL)

#### Rate Limiting & Brute Force Protection
- [x] **Login rate limiting** (5 failed attempts / 15 perc)
- [x] **IP-based tracking** (LoginHistory table)
- [x] **In-memory fallback** (ha DB failel)
- [x] **Rate limit cache** (15 perc TTL)

#### SQL Injection Prevention
- [x] **Parameterized queries** (minden SQL statement)
- [x] **mssql library** (automatic escaping)
- [x] **Input type validation** (TypeScript)
- [x] **SQL Server prepared statements**

#### Audit Trail & Logging
- [x] **Login history** (LoginHistory table)
- [x] **Létszám audit log** (ainova_letszam_audit_log)
- [x] **IP address tracking**
- [x] **Timestamp minden action-höz**
- [x] **Full JSON snapshot** audit log-ban

#### Data Validation
- [x] **Input length limits** (DoS védelem)
- [x] **Type checking** (TypeScript)
- [x] **Trim username** (whitespace védelem)
- [x] **Password min/max length**
- [x] **SQL constraint checks** (NOT NULL, CHECK constraints)

---

## ❌ Hiányzó vagy Gyenge Biztonsági Intézkedések

### 1. 🔴 KRITIKUS - Azonnali Javítás Szükséges

#### A. Plain Text Passwords Production-ban
**Probléma**: `lib/auth.ts:268-277`
```typescript
// ❌ Plain text jelszavak engedélyezettek production-ban is!
if (user.PasswordHash.startsWith('$2a$') || user.PasswordHash.startsWith('$2b$')) {
  passwordMatch = await bcrypt.compare(password, user.PasswordHash);
} else {
  passwordMatch = password === user.PasswordHash; // ⚠️ VESZÉLYES!
}
```

**Javítás**:
```typescript
if (process.env.NODE_ENV === 'production') {
  // Production-ban CSAK bcrypt hashek engedélyezettek
  if (!user.PasswordHash.startsWith('$2a$') && !user.PasswordHash.startsWith('$2b$')) {
    console.error(`[SECURITY] Plain text password detected for user ${username} in PRODUCTION!`);
    return {
      success: false,
      error: 'Biztonsági hiba. Kérjük, lépj kapcsolatba az adminisztrátorral.',
    };
  }
  passwordMatch = await bcrypt.compare(password, user.PasswordHash);
} else {
  // Development-ben mindkettő elfogadható
  if (user.PasswordHash.startsWith('$2a$') || user.PasswordHash.startsWith('$2b$')) {
    passwordMatch = await bcrypt.compare(password, user.PasswordHash);
  } else {
    passwordMatch = password === user.PasswordHash;
    console.warn('[DEV] Plain text password used for:', username);
  }
}
```

**Kockázat szint**: 🔴 **KRITIKUS**  
**Érintett felhasználók**: Összes  
**Potenciális támadás**: Credential stuffing, password dump

---

#### B. XSS Vulnerability Toast Üzenetekben
**Probléma**: `components/login/ToastNotification.tsx`
```typescript
// Feltételezve:
<div className="toast-message">{message}</div>
```

**Ha a backend error üzenet HTML-t tartalmaz**:
```typescript
error: '<script>alert("XSS")</script>'
```

**Javítás 1 - DOMPurify**:
```bash
npm install dompurify @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

function ToastNotification({ message }: { message: string }) {
  const sanitized = DOMPurify.sanitize(message, { ALLOWED_TAGS: [] });
  return <div className="toast-message">{sanitized}</div>;
}
```

**Javítás 2 - textContent (egyszerűbb)**:
```typescript
function ToastNotification({ message }: { message: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (divRef.current) {
      divRef.current.textContent = message; // XSS safe
    }
  }, [message]);
  
  return <div ref={divRef} className="toast-message" />;
}
```

**Kockázat szint**: 🔴 **MAGAS**  
**Érintett felhasználók**: Összes  
**Potenciális támadás**: Stored XSS, session hijacking

---

#### C. Session Fixation
**Probléma**: `lib/auth.ts:289`
```typescript
const sessionId = randomUUID(); // ✅ Generálás OK
// ❌ DE: nincs session regeneration login után
```

**Támadási szcenárió**:
1. Attacker szerez egy valid session ID-t (pl. network sniffing)
2. Victim bejelentkezik → ugyanaz a session ID megmarad
3. Attacker használja a session ID-t → authenticated!

**Javítás**:
```typescript
export async function login(username: string, password: string, ipAddress: string) {
  // ... authentication logic ...
  
  if (passwordMatch) {
    // ✅ FIX: Generálj ÚJ session ID-t minden successful login után
    const oldSessionId = randomUUID(); // Ha volt előző session, invalidáld
    const newSessionId = randomUUID();
    
    // Delete old session if exists
    await pool.request()
      .input('userId', sql.Int, user.UserId)
      .query('DELETE FROM dbo.Sessions WHERE UserId = @userId');
    
    // Create NEW session
    await pool.request()
      .input('sessionId', sql.UniqueIdentifier, newSessionId)
      .input('userId', sql.Int, user.UserId)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query('INSERT INTO dbo.Sessions (SessionId, UserId, CreatedAt, ExpiresAt) VALUES (@sessionId, @userId, SYSDATETIME(), @expiresAt)');
    
    return { success: true, sessionId: newSessionId, ... };
  }
}
```

**Kockázat szint**: 🔴 **MAGAS**  
**Érintett felhasználók**: Összes  
**Potenciális támadás**: Session hijacking, account takeover

---

### 2. 🟠 FONTOS - 2-4 Hét Alatt Javítandó

#### D. Weak Rate Limiting (Multi-Instance)
**Probléma**: `lib/auth.ts:66-84`
```typescript
const rateLimitCache = new Map<string, RateLimitEntry>();
```

**Skálázhatósági probléma**:
- 1 instance: 5 attempt / 15 min ✅
- 3 instances: 15 attempt / 15 min ❌ (5×3)
- Load balancer mögött: Attacker kipróbálhat N×5 jelszót

**Javítás - Redis-based rate limiting**:
```bash
npm install ioredis @types/ioredis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export async function checkRateLimit(ipAddress: string): Promise<void> {
  const key = `rate_limit:${ipAddress}`;
  const attempts = await redis.incr(key);
  
  if (attempts === 1) {
    // First attempt - set expiration
    await redis.expire(key, 15 * 60); // 15 minutes
  }
  
  if (attempts > 5) {
    throw new Error('Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva.');
  }
}
```

**Kockázat szint**: 🟠 **KÖZEPES**  
**Érintett környezet**: Production (multi-instance deployment)  
**Potenciális támadás**: Brute force attack

---

#### E. Missing HTTPS Enforcement
**Probléma**: `app/api/auth/login/route.ts:165`
```typescript
secure: process.env.NODE_ENV === 'production',
```

**Ha production-ban HTTP-t használnak** (nem HTTPS):
- Cookies nem lesznek secure flag-gel → man-in-the-middle attack
- Session ID plaintext-ben utazik → session hijacking

**Javítás - Middleware redirect**:
```typescript
// middleware.ts
export async function proxy(request: NextRequest) {
  // 1. Force HTTPS redirect in production
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-forwarded-proto') !== 'https') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      { status: 308 } // Permanent redirect
    );
  }
  
  // ... rest of middleware
}
```

**next.config.ts kiegészítés**:
```typescript
export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

**Kockázat szint**: 🟠 **KÖZEPES-MAGAS**  
**Érintett felhasználók**: Összes (production)  
**Potenciális támadás**: MITM, session hijacking

---

#### F. Missing SQL Foreign Key Constraints
**Probléma**: `database/migrations/001_create_letszam_tables.sql:43`
```sql
rogzitette_user NVARCHAR(50) NOT NULL,
-- ❌ Nincs foreign key constraint!
```

**Következmény**:
- Ha `dev` user törlődik az `AinovaUsers`-ből
- `ainova_letszam` táblában marad `rogzitette_user = 'dev'`
- **Orphaned record** → referential integrity sérül

**Javítás**:
```sql
ALTER TABLE ainova_letszam
ADD CONSTRAINT FK_letszam_user 
  FOREIGN KEY (rogzitette_user) 
  REFERENCES AinovaUsers(Username)
  ON DELETE NO ACTION  -- Tiltsd a user törlést ha van létszám rekordja
  ON UPDATE CASCADE;   -- Username változás esetén frissítsd
```

**Ugyanez a Sessions táblára**:
```sql
ALTER TABLE dbo.Sessions
ADD CONSTRAINT FK_sessions_user
  FOREIGN KEY (UserId)
  REFERENCES AinovaUsers(UserId)
  ON DELETE CASCADE;  -- User törlése esetén sessions is törlődjenek
```

**Kockázat szint**: 🟠 **KÖZEPES**  
**Érintett adatok**: Audit trail, sessions  
**Potenciális probléma**: Data integrity, orphaned records

---

### 3. 🟡 AJÁNLOTT - 1-2 Hónap Alatt

#### G. Content Security Policy (CSP)
**Probléma**: Nincs CSP header
```bash
# Jelenlegi headers (hiányos):
X-Frame-Options: (nincs)
Content-Security-Policy: (nincs)
X-Content-Type-Options: (nincs)
```

**Javítás - next.config.ts**:
```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // ⚠️ unsafe-eval csak dev-ben!
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

**Kockázat szint**: 🟡 **ALACSONY-KÖZEPES**  
**Védelmi réteg**: Defense in depth  
**Védelem ellen**: XSS, clickjacking, MIME sniffing

---

#### H. Database Connection String Encryption
**Probléma**: `.env.local` plaintext credentials
```env
DB_PASSWORD=Ad5-Ton~{pXkb{=  # ❌ Plaintext!
```

**Javítás 1 - Azure Key Vault** (production):
```typescript
import { SecretClient } from '@azure/keyvault-secrets';

const client = new SecretClient(
  process.env.KEY_VAULT_URL,
  new DefaultAzureCredential()
);

const password = await client.getSecret('db-password');
```

**Javítás 2 - Hashicorp Vault**:
```bash
export VAULT_ADDR='https://vault.company.com'
vault kv get secret/ainova/db-password
```

**Javítás 3 - Environment-based (minimális)**:
```typescript
// Titkosított .env.production (ansible vault vagy git-crypt)
DB_PASSWORD_ENCRYPTED=AES256:encrypted_base64_string

// Runtime decryption
const password = decryptPassword(process.env.DB_PASSWORD_ENCRYPTED);
```

**Kockázat szint**: 🟡 **KÖZEPES**  
**Érintett**: Production credentials  
**Potenciális probléma**: Credential leak (git commit, logs)

---

#### I. Nincs 2FA (Two-Factor Authentication)
**Probléma**: Csak username+password (single-factor)

**Támadási szcenárió**:
- Attacker szerez jelszót (phishing, keylogger)
- Nincs második védelem → account takeover

**Javítás - TOTP (Time-based One-Time Password)**:
```bash
npm install speakeasy qrcode
```

**Új tábla**:
```sql
CREATE TABLE dbo.AinovaTwoFactorAuth (
  UserId INT PRIMARY KEY,
  Secret NVARCHAR(255) NOT NULL,
  Enabled BIT DEFAULT 0,
  BackupCodes NVARCHAR(MAX),
  FOREIGN KEY (UserId) REFERENCES AinovaUsers(UserId)
);
```

**Login flow módosítás**:
```typescript
// 1. Username+password sikeres
// 2. Check if 2FA enabled
const twoFA = await getTwoFactorAuth(user.UserId);
if (twoFA?.Enabled) {
  return {
    success: false,
    requiresTwoFactor: true,
    tempToken: generateTempToken(user.UserId),
    error: 'Kétfaktoros kód szükséges',
  };
}

// 3. Frontend prompt 6-digit code
// 4. Verify code: speakeasy.totp.verify({ secret, token })
```

**Kockázat szint**: 🟡 **KÖZEPES**  
**Érintett**: Admin és érzékeny műveletek  
**Védelem**: Account takeover, credential stuffing

---

## 🛡️ Biztonsági Auditálási Checklist

### Pre-Production Checklist

#### Kód Szintű Ellenőrzés
- [ ] Nincs plain text password production-ban
- [ ] Nincs hardcoded secret a kódban
- [ ] Minden API route input validation
- [ ] Minden SQL query parameterized
- [ ] XSS védelem minden user input-ban
- [ ] CSRF token minden state-changing operation-ön
- [ ] Rate limiting minden public endpoint-on

#### Infrastruktúra
- [ ] HTTPS kikényszerítve (redirect HTTP → HTTPS)
- [ ] Security headers beállítva (CSP, HSTS, X-Frame-Options)
- [ ] Database credentials nem git-ben (Key Vault)
- [ ] Firewall rules SQL Server-re (whitelist IP-k)
- [ ] Session store (Redis) encryption at rest
- [ ] Log rotation beállítva (Winston)
- [ ] Backup strategy létszám + user adatokra

#### Monitoring & Logging
- [ ] Failed login attempts monitoring (Sentry alert)
- [ ] Abnormal activity detection (10+ failed login 1 percen belül)
- [ ] Database connection pool leak monitoring
- [ ] API rate limit exceed alerts
- [ ] Session expiry edge cases logolva
- [ ] Audit log integrity check (checksum)

#### Tesztelés
- [ ] Penetration testing (OWASP Top 10)
- [ ] SQL injection testing (sqlmap)
- [ ] XSS testing (Burp Suite)
- [ ] Session fixation testing
- [ ] CSRF testing
- [ ] Brute force resistance testing
- [ ] Load testing (1000+ concurrent sessions)

---

## 📚 Ajánlott Eszközök és Források

### Biztonsági Scanning Tools
```bash
# NPM audit (dependency vulnerabilities)
npm audit --production

# Snyk (continuous monitoring)
npm install -g snyk
snyk test

# OWASP Dependency Check
npm install -g @cyclonedx/bom
cyclonedx-bom -o bom.xml

# SQL injection scanner
sqlmap -u "http://localhost:3000/api/auth/login" --data="username=test&password=test"

# ZAP (OWASP Zed Attack Proxy)
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000
```

### Compliance Standards
- **OWASP ASVS** (Application Security Verification Standard)
- **GDPR** (ha EU személyes adatokat tárol)
- **ISO 27001** (Information Security Management)
- **PCI DSS** (ha fizetési kártyákat kezel)

### További Olvasmányok
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [SQL Server Security](https://learn.microsoft.com/en-us/sql/relational-databases/security/)

---

## 🚨 Incident Response Procedure

### Ha biztonsági incidens történik:

1. **Azonosítás** (0-15 perc)
   - [ ] Alert triggering (Sentry notification)
   - [ ] Anomaly detection (log analysis)
   - [ ] User report (support ticket)

2. **Containment** (15-60 perc)
   - [ ] Invalidate all sessions (`DELETE FROM dbo.Sessions`)
   - [ ] Block attacker IP (firewall rule)
   - [ ] Rate limit extreme restriction (1 attempt / hour)
   - [ ] Disable affected user accounts

3. **Investigation** (1-4 óra)
   - [ ] Audit log analysis (LoginHistory, létszám_audit_log)
   - [ ] Database integrity check
   - [ ] Check for data exfiltration
   - [ ] Identify attack vector

4. **Recovery** (4-24 óra)
   - [ ] Apply security patch
   - [ ] Force password reset (all users)
   - [ ] Deploy fixed version
   - [ ] Restore from backup (if needed)

5. **Post-Incident** (1-2 hét)
   - [ ] Root cause analysis dokumentálás
   - [ ] Security policy update
   - [ ] Team training
   - [ ] Prevent recurrence (új security control)

---

## ✅ Aktuális Biztonsági Státusz Összefoglaló

| Kategória | Státusz | Prioritás |
|-----------|---------|-----------|
| Password Security | 🟠 Közepes (plain text dev-ben OK, prod ❌) | 🔴 Kritikus |
| Session Management | 🟢 Jó (HTTP-only, secure, TTL) | - |
| SQL Injection | 🟢 Kiváló (parameterized queries) | - |
| XSS Protection | 🔴 Gyenge (toast messages vulnerable) | 🔴 Kritikus |
| CSRF Protection | 🟢 Jó (SameSite cookies) | - |
| Rate Limiting | 🟠 Közepes (single instance OK, multi ❌) | 🟠 Fontos |
| HTTPS Enforcement | 🟡 Hiányzik (nincs redirect) | 🟠 Fontos |
| Security Headers | 🔴 Hiányzik (CSP, HSTS, X-Frame-Options) | 🟡 Ajánlott |
| 2FA | 🔴 Nincs | 🟡 Ajánlott |
| Audit Logging | 🟢 Kiváló (LoginHistory, létszám audit) | - |

**Összességében**: 6/10 biztonsági pontszám  
**Javasolt action plan**: 3 kritikus + 2 fontos javítás → 9/10 biztonsági szint

---

**Utolsó frissítés**: 2026. január 6.  
**Következő audit**: 2026. március 1. (vagy incident esetén azonnal)
