# Új Feature Javaslatok

## 🌟 Feature Roadmap - Értékelés és Prioritások

---

## 1. MAGAS PRIORITÁS - Azonnal Hasznos

### 1.1 📱 Mobilbarát Responsive Design Javítása
**Értékelés: ⭐⭐⭐⭐⭐ Kritikus**
**Becsült idő: 8-16 óra**

**Jelenlegi állapot:**
- Desktop-ra optimalizált
- Mobil használhatóság korlátozott

**Szükséges változtatások:**
```tsx
// Responsive táblázatok
<div className="overflow-x-auto">
  <table className="min-w-[600px] md:min-w-full">
    {/* ... */}
  </table>
</div>

// Mobil menü (hamburger)
<nav className="hidden md:flex">
  {/* Desktop menü */}
</nav>
<button className="md:hidden" onClick={toggleMobileMenu}>
  ☰
</button>
```

---

### 1.2 🔔 Értesítési Rendszer
**Értékelés: ⭐⭐⭐⭐⭐ Kritikus**
**Becsült idő: 16-24 óra**

**Funkciók:**
- Orvosi lejárat figyelmeztetés (30/7/1 nap előtt)
- Kritikus létszám alert
- Import sikertelenség értesítés
- Email küldés (opcionális)

**Implementáció:**
```typescript
// lib/notifications.ts
interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  userId: number;
}

// API: GET /api/notifications
// API: PATCH /api/notifications/:id/read
// API: DELETE /api/notifications/:id
```

**UI Komponens:**
```tsx
// components/ui/NotificationBell.tsx
export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  
  return (
    <div className="relative">
      <button onClick={toggleDropdown}>
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown lista */}
    </div>
  );
}
```

---

### 1.3 📤 Excel Export Funkció Bővítése
**Értékelés: ⭐⭐⭐⭐ Fontos**
**Becsült idő: 8-12 óra**

**Jelenlegi állapot:**
- Van `/api/export` endpoint
- Alapvető xlsx generálás

**Bővítési javaslatok:**
- Formázott Excel (színek, bordók)
- Több munkalapos export
- PDF export opció
- Időszak választó
- Template-ek

**Kód:**
```typescript
// lib/excel-export.ts
import * as XLSX from 'xlsx';

export function generateFormattedExcel(data: any[], options: ExportOptions) {
  const workbook = XLSX.utils.book_new();
  
  // Worksheet létrehozása
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Oszlop szélességek
  worksheet['!cols'] = [
    { wch: 15 },  // A oszlop
    { wch: 20 },  // B oszlop
    // ...
  ];
  
  // Stílusok (xlsx-style package kell)
  // ...
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teljesítmény');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
```

---

### 1.4 🔍 Globális Keresés
**Értékelés: ⭐⭐⭐⭐ Fontos**
**Becsült idő: 12-16 óra**

**Funkció:**
Cmd/Ctrl+K gyorsbillentyűvel keresés az egész alkalmazásban.

**Keresési területek:**
- Operátorok (név, törzsszám)
- Felhasználók
- Létszám adatok (dátum, műszak)
- Teljesítmény adatok

**Implementáció:**
```tsx
// components/ui/CommandPalette.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced keresés
  useEffect(() => {
    if (query.length < 2) return;
    
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20"
        >
          <div className="bg-slate-900 w-full max-w-xl rounded-xl shadow-2xl">
            <input
              autoFocus
              type="text"
              placeholder="Keresés..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-4 bg-transparent text-white outline-none"
            />
            {/* Eredmények */}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 2. KÖZEPES PRIORITÁS - Hasznos Funkciók

### 2.1 📊 Dashboard Widget-ek
**Értékelés: ⭐⭐⭐⭐ Hasznos**
**Becsült idő: 16-24 óra**

**Widget típusok:**
1. **Mai létszám összesítő** - Gyors áttekintés
2. **Heti teljesítmény trend** - Mini chart
3. **Kritikus orvosi lejáratok** - Figyelmeztető lista
4. **Friss import státusz** - Utolsó import infó
5. **Gyors navigáció** - Legutóbbi oldalak

**Implementáció:**
```tsx
// components/dashboard/widgets/TodayStaffWidget.tsx
export function TodayStaffWidget() {
  const { data, loading } = useTodayStaff();
  
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-white mb-2">Mai létszám</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-slate-400 text-sm">A műszak</p>
          <p className="text-2xl font-bold text-blue-400">{data?.A || '-'}</p>
        </div>
        {/* B, C műszak */}
      </div>
    </div>
  );
}
```

---

### 2.2 📅 Naptár Nézet a Létszámhoz
**Értékelés: ⭐⭐⭐⭐ Hasznos**
**Becsült idő: 12-16 óra**

**Funkció:**
Havi naptár nézet, ahol látszik melyik napra van már rögzített adat.

```tsx
// components/letszam/CalendarView.tsx
export function CalendarView({ month, year }: Props) {
  const { data } = useLetszamCalendar(month, year);
  
  const days = generateCalendarDays(month, year);
  
  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Hét napjai */}
      {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(day => (
        <div key={day} className="text-center text-slate-500">{day}</div>
      ))}
      
      {/* Napok */}
      {days.map(day => (
        <CalendarDay
          key={day.date}
          date={day.date}
          hasData={data[day.date]}
          shifts={data[day.date]?.shifts}
        />
      ))}
    </div>
  );
}
```

---

### 2.3 🎨 Téma Váltás (Dark/Light)
**Értékelés: ⭐⭐⭐ Kellemes**
**Becsült idő: 8-12 óra**

**Implementáció:**
```tsx
// lib/theme.tsx
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) setTheme(saved);
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

### 2.4 🔐 Kétfaktoros Hitelesítés (2FA)
**Értékelés: ⭐⭐⭐⭐⭐ Biztonsági**
**Becsült idő: 24-32 óra**

**Típusok:**
1. TOTP (Google Authenticator)
2. Email kód
3. SMS (opcionális, költséges)

**Implementáció - TOTP:**
```bash
npm install otplib qrcode
```

```typescript
// lib/2fa.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export function generateSecret(username: string): { secret: string; qrCode: string } {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(username, 'AINOVA', secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  
  return { secret, qrCode };
}

export function verifyToken(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}
```

**Adatbázis:**
```sql
ALTER TABLE AinovaUsers ADD
  TwoFactorSecret NVARCHAR(100) NULL,
  TwoFactorEnabled BIT NOT NULL DEFAULT 0;
```

---

### 2.5 📈 Részletes Analitika Dashboard
**Értékelés: ⭐⭐⭐⭐ Hasznos**
**Becsült idő: 24-40 óra**

**Funkciók:**
- Trend analízis (heti/havi összehasonlítás)
- Legjobb/legrosszabb operátorok
- Hiányzási arányok vizualizációja
- Teljesítmény heatmap
- Exportálható riportok

---

## 3. ALACSONY PRIORITÁS - Nice to Have

### 3.1 🌍 Többnyelvűség (i18n)
**Értékelés: ⭐⭐⭐ Nice to have**
**Becsült idő: 16-24 óra**

**Támogatott nyelvek:**
- Magyar (alapértelmezett)
- Angol
- Német (TDK globális)

```bash
npm install next-intl
```

---

### 3.2 📱 PWA (Progressive Web App)
**Értékelés: ⭐⭐⭐ Nice to have**
**Becsült idő: 8-12 óra**

**Előnyök:**
- Telepíthető mobilra
- Offline működés (korlátozott)
- Push értesítések

```bash
npm install next-pwa
```

---

### 3.3 🎙️ Hang Parancsok
**Értékelés: ⭐⭐ Luxus**
**Becsült idő: 16-24 óra**

Web Speech API használatával "Navigálj a létszámhoz" típusú parancsok.

---

### 3.4 🤖 AI Asszisztens
**Értékelés: ⭐⭐⭐⭐ Innovatív**
**Becsült idő: 40+ óra**

OpenAI vagy Anthropic API integrációval:
- "Mi volt a teljesítmény a múlt héten?"
- "Ki volt beteg a B műszakban?"
- "Készíts riportot az utolsó hónapról"

---

## 4. Feature Prioritás Mátrix

| Feature | Üzleti érték | Komplexitás | ROI | Prioritás |
|---------|--------------|-------------|-----|-----------|
| Értesítések | 🔥🔥🔥 | 🟡 Közepes | ⭐⭐⭐⭐⭐ | P1 |
| Mobil responsive | 🔥🔥🔥 | 🟢 Alacsony | ⭐⭐⭐⭐⭐ | P1 |
| Excel export bővítés | 🔥🔥 | 🟢 Alacsony | ⭐⭐⭐⭐ | P1 |
| Globális keresés | 🔥🔥 | 🟡 Közepes | ⭐⭐⭐⭐ | P2 |
| Dashboard widgetek | 🔥🔥 | 🟡 Közepes | ⭐⭐⭐⭐ | P2 |
| Naptár nézet | 🔥🔥 | 🟢 Alacsony | ⭐⭐⭐⭐ | P2 |
| 2FA | 🔥🔥🔥 | 🔴 Magas | ⭐⭐⭐ | P2 |
| Téma váltás | 🔥 | 🟢 Alacsony | ⭐⭐⭐ | P3 |
| Analitika dashboard | 🔥🔥 | 🔴 Magas | ⭐⭐⭐ | P3 |
| Többnyelvűség | 🔥 | 🟡 Közepes | ⭐⭐ | P4 |
| PWA | 🔥 | 🟢 Alacsony | ⭐⭐⭐ | P4 |
| AI asszisztens | 🔥🔥 | 🔴 Nagyon magas | ⭐⭐ | P5 |

---

## 5. Javasolt Implementációs Sorrend

### Fázis 1 (1-2 hét)
1. ✅ Mobil responsive javítás
2. ✅ Excel export bővítés
3. ✅ Értesítési alapok

### Fázis 2 (2-4 hét)
4. ✅ Globális keresés
5. ✅ Dashboard widgetek
6. ✅ Naptár nézet

### Fázis 3 (4-8 hét)
7. ✅ 2FA opcionális
8. ✅ Téma váltás
9. ✅ Részletes analitika

### Fázis 4 (8+ hét)
10. ✅ Többnyelvűség
11. ✅ PWA
12. ✅ AI integráció (hosszú távon)

