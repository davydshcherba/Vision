import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import LanguageProvider from "@/components/LanguageProvider";
import "./globals.css";

// * High-contrast serif for headings — supports Cyrillic, unlike Bodoni
const display = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Дашборд задач студента",
  description: "Задачі з назвою, описом, дедлайном і файлами",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className={display.variable}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
