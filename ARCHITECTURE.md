# AINOVA - Architektúra Dokumentáció

## 🏗 Rendszer Architektúra

### High-Level Architektúra

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   CLIENT LAYER                          ┃
┃  ┌───────────────────────────────────────────────────┐ ┃
┃  │         Web Browser (Chrome, Firefox, etc.)       │ ┃
┃  │  • React Components (UI rendering)                │ ┃
┃  │  • Framer Motion (animations)                     │ ┃
┃  │  • Tailwind CSS (styling)                         │ ┃
┃  │  • State Management (React hooks)                 │ ┃
┃  └───────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                       │
                       │ HTTPS (fetch API)
                       │ JSON payloads
                       │ HTTP-only cookies
                       │
┏━━━━━━━━━━━━━━━━━━━━━▼━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 APPLICATION LAYER                       ┃
┃  ┌───────────────────────────────────────────────────┐ ┃
┃  │         Next.js 16 Server (Node.js 20)            │ ┃
┃  │                                                    │ ┃
┃  │  ┌────────────────┐      ┌────────────────────┐  │ ┃
┃  │  │  API Routes    │      │  Server-Side       │  │ ┃
┃  │  │  (REST-like)   │      │  Rendering (SSR)   │  │ ┃
┃  │  │                │      │                    │  │ ┃
┃  │  │ • /api/auth/*  │      │ • React Server     │  │ ┃
┃  │  │ • /api/admin/* │      │   Components       │  │ ┃
┃  │  │ • /api/        │      │ • Static           │  │ ┃
┃  │  │   dashboard/*  │      │   Generation       │  │ ┃
┃  │  └────────┬───────┘      └────────────────────┘  │ ┃
┃  │           │                                        │ ┃
┃  │           │                                        │ ┃
┃  │  ┌────────▼────────────────────────────────────┐  │ ┃
┃  │  │       Business Logic Layer (lib/)          │  │ ┃
┃  │  │                                             │  │ ┃
┃  │  │  • auth.ts    → Authentication logic       │  │ ┃
┃  │  │                 Session management         │  │ ┃
┃  │  │                 Rate limiting              │  │ ┃
┃  │  │                                             │  │ ┃
┃  │  │  • db.ts      → Database connection pool   │  │ ┃
┃  │  │                 Singleton pattern          │  │ ┃
┃  │  │                 Graceful shutdown          │  │ ┃
┃  │  └─────────────────────────────────────────────┘  │ ┃
┃  └───────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                       │
                       │ mssql driver (TDS protocol)
                       │ Connection pooling (max 10)
                       │ Parameterized queries
                       │
┏━━━━━━━━━━━━━━━━━━━━━▼━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   DATA LAYER                            ┃
┃  ┌───────────────────────────────────────────────────┐ ┃
┃  │      SQL Server / LocalDB (AINOVA_DEV)            │ ┃
┃  │                                                    │ ┃
┃  │  • dbo.Users          (authentication)            │ ┃
┃  │  • dbo.Sessions       (active sessions)           │ ┃
┃  │  • dbo.LoginHistory   (audit trail)               │ ┃
┃  │                                                    │ ┃
┃  │  Constraints:                                      │ ┃
┃  │  • Foreign Keys (referential integrity)           │ ┃
┃  │  • Unique Constraints (username uniqueness)       │ ┃
┃  │  • Check Constraints (role validation)            │ ┃
┃  │  • Indexes (performance optimization)             │ ┃
┃  └───────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 🔄 Request-Response Flow

### 1. Login Flow (Részletes)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ [1] User submits login form
       │     username: "demo"
       │     password: "demo123"
       │
       ▼
┌─────────────────────────────────────────┐
│  LoginPage Component (Client)           │
│  • handleSubmit() triggered             │
│  • Client-side validation               │
└──────┬──────────────────────────────────┘
       │
       │ [2] POST /api/auth/login
       │     Content-Type: application/json
       │     Body: { username, password }
       │
       ▼
┌─────────────────────────────────────────┐
│  /api/auth/login Route Handler          │
│  • Parse JSON body                      │
│  • Input validation (length, type)     │
│  • Extract IP address (x-forwarded-for)│
└──────┬──────────────────────────────────┘
       │
       │ [3] await login(username, password, ipAddress)
       │
       ▼
┌─────────────────────────────────────────┐
│  lib/auth.ts::login()                   │
│                                         │
│  Step 1: checkRateLimit(ipAddress)     │
│  ├─> Query LoginHistory                │
│  ├─> Count failed attempts (15 min)    │
│  └─> Throw error if > 5 attempts       │
│                                         │
│  Step 2: Fetch user from database      │
│  ├─> getPool() → connection pool       │
│  └─> SELECT * FROM Users               │
│      WHERE Username = @username         │
│                                         │
│  Step 3: Check user exists & IsActive  │
│                                         │
│  Step 4: bcrypt.compare(password, hash)│
│  └─> ~250-350ms computation time       │
│                                         │
│  Step 5: Generate session ID           │
│  └─> crypto.randomUUID()               │
│                                         │
│  Step 6: Create session in DB          │
│  └─> INSERT INTO Sessions              │
│      (SessionId, UserId, ExpiresAt)     │
│                                         │
│  Step 7: Audit log                     │
│  └─> INSERT INTO LoginHistory          │
│      (UserId, Success=1, IPAddress)     │
└──────┬──────────────────────────────────┘
       │
       │ [4] Return LoginResult
       │     { success, sessionId, user }
       │
       ▼
┌─────────────────────────────────────────┐
│  /api/auth/login Route Handler          │
│  • Create NextResponse                  │
│  • Set HTTP-only cookie:                │
│    sessionId=<UUID>                     │
│    HttpOnly; Secure; SameSite=Lax       │
│    Max-Age=86400 (24h)                  │
└──────┬──────────────────────────────────┘
       │
       │ [5] Response 200 OK
       │     Set-Cookie: sessionId=...
       │     Body: { success: true, user }
       │
       ▼
┌─────────────────────────────────────────┐
│  LoginPage Component (Client)           │
│  • Show success toast                   │
│  • Store user in sessionStorage         │
│  • router.push('/dashboard')            │
└──────┬──────────────────────────────────┘
       │
       │ [6] Navigate to /dashboard
       │
       ▼
┌─────────────────────────────────────────┐
│  DashboardPage Component                │
│  • Cookie: sessionId=... (auto-sent)    │
│  • Session validated via middleware     │
│  • Render dashboard UI                  │
└─────────────────────────────────────────┘
```

---

### 2. Protected Route Access Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ GET /dashboard/letszam
       │ Cookie: sessionId=12345-uuid
       │
       ▼
┌─────────────────────────────────────────┐
│  Next.js Server (middleware-like check) │
│  • Extract sessionId from cookie        │
└──────┬──────────────────────────────────┘
       │
       │ validateSession(sessionId)
       │
       ▼
┌─────────────────────────────────────────┐
│  lib/auth.ts::validateSession()         │
│                                         │
│  Step 1: Check in-memory cache          │
│  ├─> sessionCache.get(sessionId)        │
│  ├─> Cache hit? (TTL < 5 min)          │
│  └─> Return cached SessionData          │
│                                         │
│  Step 2: Cache miss → Query DB          │
│  └─> SELECT u.*, s.ExpiresAt            │
│      FROM Sessions s                    │
│      JOIN Users u ON s.UserId = u.UserId│
│      WHERE s.SessionId = @sessionId     │
│        AND s.ExpiresAt > SYSDATETIME()  │
│        AND u.IsActive = 1               │
│                                         │
│  Step 3: Cache result (5 min TTL)      │
│  └─> sessionCache.set(sessionId, data)  │
└──────┬──────────────────────────────────┘
       │
       │ Return SessionData | null
       │
       ▼
┌─────────────────────────────────────────┐
│  Route Handler / Page Component         │
│  • If session null:                     │
│    └─> Redirect to /login              │
│  • If session valid:                    │
│    └─> Render protected content         │
└─────────────────────────────────────────┘
```

---

## 📦 Module Architecture

### Component Module Structure

```
components/
│
├── dashboard/              # Dashboard-specific components
│   ├── Header.tsx          # Navigation header (back, logout)
│   ├── MenuTile.tsx        # Module selection cards
│   ├── admin/              # Admin panel components
│   │   ├── AdminAuthModal.tsx     # Re-auth dialog
│   │   └── AdminMenuCard.tsx      # Admin menu item
│   └── index.ts            # Barrel export file
│
├── letszam/                # Létszám module components
│   ├── DateSelector.tsx    # Date picker with today button
│   ├── MuszakSelector.tsx  # Shift selector (A/B/C)
│   ├── LetszamTable.tsx    # Data entry table
│   ├── LetszamSummary.tsx  # Summary statistics cards
│   ├── KritikusPozicioModal.tsx  # Critical position warning
│   └── types.ts            # TypeScript interfaces
│
└── login/                  # Login page components
    ├── LoginContainer.tsx  # Form wrapper (glassmorphism)
    ├── AinovaLogo.tsx      # Company logo
    ├── InputField.tsx      # Custom text/password input
    ├── RippleButton.tsx    # Animated submit button
    ├── ToastNotification.tsx  # Feedback messages
    └── InteractiveBackground.tsx  # Animated background
```

### Routing Architecture (Next.js App Router)

```
app/
│
├── page.tsx                # Root (/) → redirect to /login
├── layout.tsx              # Root layout (global styles)
├── globals.css             # Tailwind CSS imports
│
├── login/
│   └── page.tsx            # Login page (public)
│
├── change-password/
│   └── page.tsx            # Password change (authenticated)
│
├── dashboard/              # Protected dashboard area
│   ├── layout.tsx          # Dashboard layout (header)
│   ├── page.tsx            # Main dashboard (module tiles)
│   │
│   ├── letszam/
│   │   └── page.tsx        # Létszám data entry
│   │
│   ├── teljesitmeny/       # (WIP - not implemented)
│   │
│   ├── gepadat/            # (WIP - not implemented)
│   │
│   └── admin/              # Admin panel
│       ├── page.tsx        # Admin main menu
│       └── users/
│           └── new/
│               └── page.tsx  # Create new user
│
└── api/                    # Backend API routes
    ├── auth/
    │   ├── login/
    │   │   └── route.ts    # POST /api/auth/login
    │   ├── logout/
    │   │   └── route.ts    # POST /api/auth/logout
    │   └── change-password/
    │       └── route.ts    # POST /api/auth/change-password
    │
    ├── admin/
    │   ├── verify/
    │   │   └── route.ts    # POST /api/admin/verify
    │   └── users/
    │       └── route.ts    # GET/POST /api/admin/users
    │
    ├── dashboard/
    │   └── user/
    │       └── route.ts    # GET /api/dashboard/user
    │
    ├── test-db/
    │   └── route.ts        # GET /api/test-db
    │
    └── weather/
        └── route.ts        # GET /api/weather (example)
```

---

## 🗃 Database Connection Architecture

### Connection Pool (Singleton Pattern)

```typescript
// lib/db.ts

┌─────────────────────────────────────────────────────────┐
│           Application Lifecycle                         │
└─────────────────────────────────────────────────────────┘

[Server Start]
      │
      ▼
┌──────────────────┐
│  No pool exists  │
│  pool = null     │
└────────┬─────────┘
         │
         │ First API request arrives
         │
         ▼
┌────────────────────────────────┐
│  getPool() called              │
│  • Check if pool exists        │
│  • Check if connected          │
│  • Check if connecting         │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Create ConnectionPool         │
│  • new sql.ConnectionPool()    │
│  • await pool.connect()        │
│  • pool.connected = true       │
└────────┬───────────────────────┘
         │
         │ Singleton instance created
         │
         ▼
┌────────────────────────────────┐
│  Return pool to caller         │
│  • Same instance for all       │
│  • Connection reuse            │
│  • Auto-reconnect on failure   │
└────────┬───────────────────────┘
         │
         │ Subsequent requests
         │
         ▼
┌────────────────────────────────┐
│  getPool() called again        │
│  • pool exists and connected   │
│  • Return existing pool        │
│  • No new connection created   │
└────────────────────────────────┘

[Server Shutdown]
      │
      ▼
┌────────────────────────────────┐
│  SIGINT/SIGTERM received       │
│  • gracefulShutdown() triggered│
│  • closePool(isFullShutdown)   │
│  • await pool.close()          │
│  • process.exit(0)             │
└────────────────────────────────┘
```

### Connection Pool Configuration

```typescript
pool: {
  max: 10,                 // Maximum connections
  min: 0,                  // Minimum idle connections
  idleTimeoutMillis: 30000 // 30 seconds before closing idle
}

connectionTimeout: 10000,  // 10 seconds (VPN-friendly)
requestTimeout: 15000      // 15 seconds for queries
```

---

## 🔐 Security Architecture

### Defense in Depth (Multi-Layer Security)

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Network Security                              │
│  • HTTPS (TLS 1.3)                                      │
│  • Firewall rules (SQL Server port 1433)               │
│  • VPN access (production environment)                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Application Security (Next.js Server)         │
│  • Input validation (type, length, format)              │
│  • Rate limiting (5 fails / 15 min)                     │
│  • CSRF protection (SameSite cookies)                   │
│  • XSS protection (React auto-escaping)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Authentication Layer (lib/auth.ts)            │
│  • bcrypt password hashing (12 rounds)                  │
│  • HTTP-only session cookies                            │
│  • Session expiration (24 hours)                        │
│  • First login detection                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Data Access Layer (lib/db.ts)                 │
│  • Parameterized SQL queries (SQL injection prevention) │
│  • Connection pooling (DoS mitigation)                  │
│  • Prepared statements                                  │
│  • Type-safe queries (TypeScript)                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: Database Security (SQL Server)                │
│  • User permissions (GRANT/REVOKE)                      │
│  • Foreign key constraints                              │
│  • Check constraints (role validation)                  │
│  • Audit trail (LoginHistory)                           │
└─────────────────────────────────────────────────────────┘
```

### Password Hashing Flow

```
┌─────────────────┐
│  Plain Password │  "demo123"
└────────┬────────┘
         │
         │ bcrypt.hash(password, 12)
         │ • Generate random salt
         │ • Iterate 2^12 = 4096 times
         │ • ~250-350ms computation time
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  Hashed Password (60 chars)                              │
│  $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS6... │
│   │  │                    └─ Hash (31 chars)             │
│   │  │                                                    │
│   │  └─ Salt (22 chars)                                  │
│   └─ Cost factor (12 = 2^12 iterations)                  │
└──────────────────────────────────────────────────────────┘
         │
         │ Stored in dbo.Users.PasswordHash
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  Login Verification                                      │
│  • User enters password: "demo123"                       │
│  • bcrypt.compare("demo123", stored_hash)                │
│  • Returns: true/false                                   │
│  • Time-constant comparison (timing attack protection)   │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 State Management Architecture

### Client-Side State (React Hooks)

```typescript
// Login Page State
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [glowState, setGlowState] = useState<'idle' | 'success' | 'error'>('idle');

// Létszám Page State
const [selectedDatum, setSelectedDatum] = useState<Date>(new Date());
const [selectedMuszak, setSelectedMuszak] = useState<'A' | 'B' | 'C'>('A');
const [operativData, setOperativData] = useState<LetszamRow[]>([...]);
const [nemOperativData, setNemOperativData] = useState<LetszamRow[]>([...]);
```

### Server-Side State

```typescript
// In-Memory Caches (lib/auth.ts)

// Session Cache (5 min TTL)
const sessionCache = new Map<string, SessionCacheEntry>();
// Key: sessionId
// Value: { data: SessionData, cachedAt: number }

// Rate Limit Cache (15 min reset)
const rateLimitCache = new Map<string, RateLimitEntry>();
// Key: ipAddress
// Value: { count: number, resetAt: number }
```

### Database State (Persistent)

```sql
-- Active Sessions
SELECT * FROM dbo.Sessions WHERE ExpiresAt > SYSDATETIME();

-- Failed Login Attempts (last 15 min)
SELECT COUNT(*) FROM dbo.LoginHistory
WHERE IPAddress = @ip
  AND Success = 0
  AND LoginTime > DATEADD(MINUTE, -15, SYSDATETIME());
```

---

## 🚀 Deployment Architecture

### Development Environment

```
Developer Workstation
├── Node.js 20.x
├── npm 10.x
├── SQL Server LocalDB
│   └── AINOVA_DEV database
├── VS Code / WebStorm
└── Browser (Chrome DevTools)

Commands:
• npm run dev     → http://localhost:3000
• npm run build   → Production build
• npm run lint    → ESLint check
```

### Production Environment (Planned)

```
Cloud Platform (Azure / AWS / Vercel)
├── Next.js Server (Docker container)
│   ├── CPU: 2 vCPU
│   ├── RAM: 4 GB
│   └── Storage: 20 GB SSD
├── SQL Server (Managed Instance)
│   ├── CPU: 4 vCPU
│   ├── RAM: 16 GB
│   ├── Storage: 100 GB SSD
│   └── Backup: Daily automated
└── Load Balancer
    ├── SSL Termination (TLS 1.3)
    ├── Health Checks (every 30s)
    └── Auto-scaling (2-10 instances)

Monitoring:
• Application Insights (Azure)
• CloudWatch (AWS)
• Vercel Analytics
```

---

## 📈 Performance Optimization

### Caching Strategy

```
┌──────────────────────────────────────┐
│  Client Browser                      │
│  • Static assets (CSS, JS, images)  │
│  • Cache-Control: public, max-age   │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  Next.js Server                      │
│  • Server-side caching:              │
│    - Session cache (5 min TTL)       │
│    - Rate limit cache (15 min TTL)   │
│  • Static page generation            │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  Database (SQL Server)               │
│  • Query result caching              │
│  • Indexed columns (fast lookups)    │
│  • Connection pooling (reuse)        │
└──────────────────────────────────────┘
```

### Query Optimization

```sql
-- ✅ OPTIMIZED: Uses IX_Sessions_ExpiresAt index
SELECT * FROM Sessions
WHERE SessionId = @sessionId
  AND ExpiresAt > SYSDATETIME();

-- ✅ OPTIMIZED: Uses IX_Users_Username index
SELECT * FROM Users WHERE Username = @username;

-- ✅ OPTIMIZED: Uses IX_LoginHistory_LoginTime index
SELECT COUNT(*) FROM LoginHistory
WHERE IPAddress = @ip
  AND LoginTime > DATEADD(MINUTE, -15, SYSDATETIME());
```

---

## 🧪 Testing Strategy (Planned)

### Testing Pyramid

```
         /\
        /  \       E2E Tests (Playwright)
       /────\      • Login flow
      /      \     • Dashboard navigation
     /        \    • Létszám module workflow
    /──────────\
   /            \  Integration Tests (Jest)
  /              \ • API routes
 /                \• Database queries
/──────────────────\
                    Unit Tests (Jest)
                    • Helper functions
                    • Validation logic
                    • Component rendering
```

---

## 📝 Documentation Structure

```
ainova-clean/
├── README.md                  # Quick start guide
├── PROJECT_OVERVIEW.md        # Complete project documentation (THIS FILE)
├── ARCHITECTURE.md            # Architecture diagrams & flows
├── scripts/
│   └── db-schema.sql          # Database schema definition
└── docs/ (planned)
    ├── API.md                 # API endpoint documentation
    ├── DEPLOYMENT.md          # Deployment guide
    └── CONTRIBUTING.md        # Development guidelines
```

---

**Dokumentáció utoljára frissítve**: 2024-12-28  
**Verzió**: 1.0.0  
**Szerző**: AI Assistant (GitHub Copilot)
