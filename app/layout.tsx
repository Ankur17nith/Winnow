import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Martian_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });
const martian = Martian_Mono({ subsets: ["latin"], variable: "--font-martian", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Winnow: let your users pick the winning prompt",
  description: "Paste a README, get roasted, and vote. Every visitor silently tests a different prompt, and Flagsmith Experimentation finds the winner.",
  icons: { icon: "/icon.svg" },
  openGraph: { title: "Winnow: let your users pick the winning prompt", description: "Paste a README, get roasted, vote grain or chaff. Flagsmith Experimentation finds the winning prompt.", type: "website", images: ["/api/card"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plex.variable} ${martian.variable}`}>
      <body>
        <a className="skip" href="#tool">Skip to the tool</a>
        {children}
      </body>
    </html>
  );
}
