import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Spotlight from "@/components/Spotlight";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Outils JDR",
  description: "Les outils de la table, pour les joueurs.",
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
      </body>
    </html>
  );
}
