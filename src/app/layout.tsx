import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Spotlight from "@/components/Spotlight";
import "./globals.css";
import { getSessionUserId } from "@/lib/session";
import { getUserById } from "@/lib/db";
import { islandColorFor } from "@/lib/dashboard";
import { isEntityPlayer } from "@/tools/homunculus/entity";

// Thème « Le Navire » : Geist partout (titres compris), Geist Mono pour les chiffres.
const display = Geist({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });
// Thème « Astre déchu » (Entités) : il garde ses polices d'origine.
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Le Navire",
  description: "Les outils de la table, pour les joueurs.",
  icons: { icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  // Installé sur l'écran d'accueil d'un iPhone : plein écran, nom court.
  appleWebApp: { capable: true, title: "Le Navire", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#061219",
  colorScheme: "dark",
};

/**
 * Thème « Astre déchu » : l'attribut html[data-astral] est posé ici, côté serveur, pour une Entité (pas de
 * clignotement au premier affichage, et le même HTML côté serveur et côté client). SkyEntry le pose et le retire
 * ensuite lors des navigations (changement de compte sans rechargement compris).
 */
async function theme(): Promise<{ astral: boolean; isle: string | null }> {
  try {
    const id = await getSessionUserId();
    const user = id ? await getUserById(id) : undefined;
    if (!user) return { astral: false, isle: null };
    if (isEntityPlayer(user)) return { astral: true, isle: null };
    // Couleur de l'île où mouille le Navire du joueur : elle teinte tout le site.
    return { astral: false, isle: await islandColorFor(user) };
  } catch {
    return { astral: false, isle: null };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { astral, isle } = await theme();
  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable} ${inter.variable}`}
      data-astral={astral ? "" : undefined}
      style={isle ? ({ ["--isle" as string]: isle } as React.CSSProperties) : undefined}
    >
      <body>
        {/* Clavier : le premier arrêt de Tab saute la navigation. */}
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {/* Fond animé : lueur des profondeurs + bulles (purement décoratif). */}
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
