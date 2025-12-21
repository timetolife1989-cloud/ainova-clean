import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AINOVA - Termelésirányító rendszer",
  description: "Bejelentkezés",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>
        <div className="cosmic-gradient" />
        <div className="star-field" />
        <div className="particle-layer" />
        {children}
      </body>
    </html>
  );
}
