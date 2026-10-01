import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = "MenuSky | Carta digital y pedidos por QR para restaurantes";
const SITE_DESCRIPTION =
  "Carta digital y pedidos por QR para restaurantes, bares y cafés. Tus clientes piden desde la mesa y cocina lo ve al instante. Pedí tu demo por WhatsApp.";

// Las imágenes de Open Graph y Twitter salen de app/opengraph-image.png y
// app/twitter-image.png (convención de archivos de metadata de Next).
export const metadata: Metadata = {
  metadataBase: new URL("https://menusky.vercel.app"),
  title: {
    default: SITE_TITLE,
    template: "%s | MenuSky",
  },
  description: SITE_DESCRIPTION,
  applicationName: "MenuSky",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "MenuSky",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
