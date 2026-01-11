# Teljesítmény Optimalizáció

## 🚀 Összesített Teljesítmény Értékelés: ⭐⭐⭐⭐ (4/5)

---

## 1. Jelenlegi Teljesítmény Analízis

### 1.1 Adatbázis Kapcsolat ✅
**Értékelés: ⭐⭐⭐⭐⭐ (5/5)**

| Metrika | Érték | Értékelés |
|---------|-------|-----------|
| Connection Pool | 2-10 kapcsolat | ✅ Megfelelő |
| Idle Timeout | 30 mp | ✅ Jó |
| Connection Timeout | 30 mp | ✅ Megfelelő |
| Request Timeout | 30 mp | ✅ Megfelelő |

**Kód:**
```typescript
// lib/db.ts
pool: {
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
},
```

---

### 1.2 Session Cache ✅
**Értékelés: ⭐⭐⭐⭐ (4/5)**

| Metrika | Érték | Értékelés |
|---------|-------|-----------|
| Cache TTL | 5 perc | ✅ Megfelelő |
| Tárolás | In-memory Map | ⚠️ Nem skálázható |
| Cleanup | Nincs explicit | ⚠️ Memory leak kockázat |

**Javítandó:**
```typescript
// lib/auth.ts - Jelenlegi
const sessionCache = new Map<string, SessionCacheEntry>();

// Javasolt - LRU Cache
import { LRUCache } from 'lru-cache';

const sessionCache = new LRUCache<string, SessionCacheEntry>({
  max: 1000,  // Maximum 1000 session
  ttl: 5 * 60 * 1000,  // 5 perc TTL
});
```

**Telepítés:**
```bash
npm install lru-cache
```

---

### 1.3 API Response Time Becslések

| Endpoint | Becsült idő | Értékelés | Javítási lehetőség |
|----------|-------------|-----------|-------------------|
| GET /api/auth/validate-session | 5-10ms (cache hit) | ✅ | - |
| GET /api/auth/validate-session | 50-100ms (cache miss) | ✅ | - |
| POST /api/auth/login | 200-400ms | ✅ | bcrypt async |
| GET /api/admin/users | 100-500ms | ⚠️ | Pagination + Cache |
| GET /api/teljesitmeny | 200-1000ms | ⚠️ | Cache szükséges |
| GET /api/letszam | 50-200ms | ✅ | - |
| POST /api/letszam | 100-300ms | ✅ | Transaction |

---

## 2. Optimalizációs Javaslatok

### 2.1 API Response Caching 🔧
**Prioritás: MAGAS**

A teljesítmény adatok ritkán változnak, cache-elhetők.

**Implementáció - Next.js unstable_cache:**
```typescript
// lib/cache/teljesitmeny.ts
import { unstable_cache } from 'next/cache';
import { getPool, sql } from '@/lib/db';

export const getCachedTeljesitmenyData = unstable_cache(
  async (type: string, muszak: string, offset: number) => {
    const pool = await getPool();
    // ... lekérdezés
    return data;
  },
  ['teljesitmeny-data'],
  {
    revalidate: 300,  // 5 percenként frissül
    tags: ['teljesitmeny'],
  }
);

// Cache invalidálás (import után):
import { revalidateTag } from 'next/cache';
revalidateTag('teljesitmeny');
```

**Alternatíva - Redis Cache:**
```typescript
// lib/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}
```

---

### 2.2 Database Query Optimization 🔧
**Prioritás: KÖZEPES**

**Jelenlegi probléma - N+1 lekérdezés az operátoroknál:**
```typescript
// Jelenlegi: Minden operátorhoz külön orvosi lekérdezés
for (const operator of operators) {
  const orvosi = await fetch(`/api/operatorok/${operator.id}/orvosi`);
}
```

**Javítás - JOIN vagy batch lekérdezés:**
```sql
-- Egy lekérdezésben az összes adat
SELECT 
  o.*,
  (SELECT TOP 1 lejarat FROM OperatorOrvosi 
   WHERE operatorId = o.id 
   ORDER BY lejarat ASC) as legkozelebb_lejaro
FROM Operators o
WHERE o.isActive = 1;
```

**Javítás - SQL index optimalizáció:**
```sql
-- Hiányzó indexek hozzáadása
CREATE INDEX IX_ainova_teljesitmeny_datum_muszak 
ON ainova_teljesitmeny(datum, muszak) 
INCLUDE (leadott_perc, torzsszam);

CREATE INDEX IX_ainova_letszam_datum_muszak 
ON ainova_letszam(datum, muszak);

CREATE INDEX IX_AinovaUsers_Role_IsActive 
ON AinovaUsers(Role, IsActive) 
INCLUDE (Username, FullName);
```

---

### 2.3 Frontend Bundle Optimization 🔧
**Prioritás: KÖZEPES**

**Jelenlegi állapot ellenőrzése:**
```bash
npm run build
# Ellenőrizd a .next/analyze fájlokat
```

**Javaslatok:**

1. **Dynamic imports a nagy komponensekhez:**
```typescript
// app/dashboard/teljesitmeny/page.tsx
import dynamic from 'next/dynamic';

const TeljesitmenyChart = dynamic(
  () => import('@/components/teljesitmeny/TeljesitmenyChart'),
  { 
    loading: () => <div>Chart betöltése...</div>,
    ssr: false  // Client-only (Recharts)
  }
);
```

2. **Framer Motion tree shaking:**
```typescript
// Jelenleg
import { motion, AnimatePresence } from 'framer-motion';

// Javasolt - csak ami kell
import { m, LazyMotion, domAnimation } from 'framer-motion';

// layout.tsx
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>
```

3. **Recharts lightweight import:**
```typescript
// Jelenleg
import { ComposedChart, Bar, Line, ... } from 'recharts';

// Javasolt - csak ami kell
import { ComposedChart } from 'recharts/lib/chart/ComposedChart';
import { Bar } from 'recharts/lib/cartesian/Bar';
```

---

### 2.4 Image Optimization 🔧
**Prioritás: ALACSONY**

**Jelenlegi állapot:**
- Nincs kép az alkalmazásban (emoji ikonok)
- Logo SVG-ként van renderelve (CSS)

**Ha képek kellenek később:**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="AINOVA"
  width={48}
  height={48}
  priority  // LCP optimalizáció
/>
```

---

### 2.5 Server-Side Rendering Optimization 🔧
**Prioritás: KÖZEPES**

**Jelenlegi állapot:**
A dashboard oldalak `'use client'` direktívát használnak - minden kliens oldalon renderelődik.

**Javasolt - Hibrid megközelítés:**
```typescript
// app/dashboard/teljesitmeny/page.tsx

// Server Component - adatok lekérése
async function TeljesitmenyData({ type, muszak }: Props) {
  const data = await getCachedTeljesitmenyData(type, muszak);
  return <TeljesitmenyChart data={data} />;
}

// Client Component - interakciók
'use client';
function TeljesitmenyControls() {
  const [type, setType] = useState('napi');
  // ...
}

// Page - kombináció
export default function TeljesitmenyPage() {
  return (
    <>
      <TeljesitmenyControls />
      <Suspense fallback={<Loading />}>
        <TeljesitmenyData type="napi" muszak="SUM" />
      </Suspense>
    </>
  );
}
```

---

## 3. Mérési és Monitoring Javaslatok

### 3.1 Performance Monitoring Setup

**Vercel Analytics (ha Vercel-en hostolt):**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom API Timing:**
```typescript
// lib/api-utils.ts
export function withTiming<T>(
  handler: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  return handler().finally(() => {
    const duration = performance.now() - start;
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  });
}

// Használat:
const data = await withTiming(
  () => pool.request().query(sql),
  'GET /api/teljesitmeny'
);
```

---

### 3.2 Database Query Logging

```typescript
// lib/db.ts - Query timing
export async function queryWithTiming<T>(
  pool: sql.ConnectionPool,
  queryName: string,
  queryFn: (request: sql.Request) => Promise<sql.IResult<T>>
): Promise<sql.IResult<T>> {
  const start = Date.now();
  const request = pool.request();
  
  try {
    const result = await queryFn(request);
    const duration = Date.now() - start;
    
    if (duration > 500) {
      console.warn(`[DB] Slow query: ${queryName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`[DB] Query failed: ${queryName}`, error);
    throw error;
  }
}
```

---

## 4. Teljesítmény Célok

| Metrika | Jelenlegi | Cél | Javítás |
|---------|-----------|-----|---------|
| First Contentful Paint | ~1.5s | <1s | SSR, preload |
| Largest Contentful Paint | ~2.5s | <2s | Image opt, code split |
| Time to Interactive | ~3s | <2.5s | Code splitting |
| API Response (cached) | N/A | <50ms | Redis cache |
| API Response (DB) | 200-1000ms | <300ms | Query opt, index |
| Bundle Size (JS) | ~500KB | <350KB | Tree shaking |

---

## 5. Implementációs Sorrend

| # | Optimalizáció | Hatás | Komplexitás | Prioritás |
|---|---------------|-------|-------------|-----------|
| 1 | API Response Cache | 🔥🔥🔥 Nagy | 🟡 Közepes | P1 |
| 2 | Database Index | 🔥🔥🔥 Nagy | 🟢 Alacsony | P1 |
| 3 | LRU Session Cache | 🔥 Kicsi | 🟢 Alacsony | P2 |
| 4 | Dynamic Imports | 🔥🔥 Közepes | 🟢 Alacsony | P2 |
| 5 | Framer Motion opt | 🔥 Kicsi | 🟢 Alacsony | P3 |
| 6 | SSR Hibrid | 🔥🔥 Közepes | 🔴 Magas | P3 |

---

## 6. Tesztelési Script

```bash
# Build analízis
npm run build

# Lighthouse audit (ha van Chrome)
npx lighthouse http://localhost:3000/dashboard --view

# Bundle analízis
npm install -D @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer(nextConfig);

# Futtatás
ANALYZE=true npm run build
```

