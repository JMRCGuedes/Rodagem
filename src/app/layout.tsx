import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegistarSW } from "@/components/RegistarSW";
import "./globals.css";

// Tipo de letra servido pela própria aplicação (funciona também na PWA sem rede).
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Rodagem", template: "%s · Rodagem" },
  description: "Gestão de frota, motoristas e serviços para transportadoras.",
  applicationName: "Rodagem",
  appleWebApp: { capable: true, title: "Rodagem", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={inter.variable}>
      <body>
        {children}
        <RegistarSW />
      </body>
    </html>
  );
}
