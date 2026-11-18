import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Spotlight from "@/components/Spotlight";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Outils JDR",
  description: "Les outils de la table, pour les joueurs.",
  icons: { icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  // Installé sur l'écran d'accueil d'un iPhone : plein écran, nom court.
  appleWebApp: { capable: true, title: "Table JDR", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0e0c13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body>
        {/* Fond animé : aurore + étoiles (purement décoratif). */}
        <div className="sky" aria-hidden="true">
          <span className="aurora" />
          <span className="stars" />
          <span className="stars stars-2" />
        </div>
        <Spotlight />
        {children}
        {/* Statistiques de visite Vercel (actives seulement une fois déployé sur Vercel). */}
        <Analytics />
      </body>
    </html>
  );
}
