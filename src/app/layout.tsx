import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outils JDR",
  description: "Les outils de la table, pour les joueurs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
