import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppStateProvider } from "@/lib/app-state";
import { Header } from "@/components/header";
import { SourceBar } from "@/components/source-bar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: { default: "SadarIklim — Peringatan dini berbasis dampak", template: "%s — SadarIklim" },
  description:
    "Platform pendukung keputusan kesiapsiagaan bencana pesisir dan hutan tropis: peringatan dini berbasis dampak, triase visual, dan intelijen spasial",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f2b2a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="flex min-h-dvh flex-col">
        <AppStateProvider>
          <a
            href="#konten"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
          >
            Lewati ke konten utama
          </a>
          <Header />
          <div role="region" aria-label="Status sumber data">
            <SourceBar />
          </div>
          <main id="konten" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5">
            {children}
          </main>
          <Footer />
        </AppStateProvider>
      </body>
    </html>
  );
}
