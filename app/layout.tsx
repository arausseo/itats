import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/src/i18n/routing";

// Tipografías del sistema de diseño ReclutaIT (ver globals.css):
//   Hanken Grotesk → --font-sans · JetBrains Mono → --font-mono
const hanken = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ReclutaIT — ATS con IA para talento IT de LATAM",
  description: "Applicant Tracking System con IA para reclutar talento IT en LATAM.",
  icons: {
    icon: [
      { url: "/logo/logo-mark.svg", type: "image/svg+xml" },
      { url: "/logo/png/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/logo/png/apple-touch-icon-180.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const locale = h.get("x-next-intl-locale") ?? routing.defaultLocale;

  return (
    <html
      lang={locale}
      className={cn(
        "h-full",
        "antialiased",
        hanken.variable,
        jetbrainsMono.variable,
        "font-sans",
      )}
    >
      <head>
        {/* Aplica el tema guardado antes del primer render (evita flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
