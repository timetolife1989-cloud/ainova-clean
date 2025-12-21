'use client';

export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="acrylic p-8 rounded-2xl">
      {children}
    </div>
  );
}
