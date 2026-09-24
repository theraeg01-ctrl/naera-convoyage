import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav, Sidebar } from "@/components/layout/navigation";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { ServiceWorkerRegister } from "@/components/layout/service-worker";
import { THEME_SCRIPT } from "@/components/layout/theme-script";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "NAERA Convoyage";

const STARTUP_IMAGES = [
  { width: 390, height: 844, ratio: 3, file: "1170x2532" },
  { width: 393, height: 852, ratio: 3, file: "1179x2556" },
  { width: 430, height: 932, ratio: 3, file: "1290x2796" },
  { width: 375, height: 667, ratio: 2, file: "750x1334" },
];

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Estimer, organiser, tarifer et suivre des missions de convoyage automobile.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: "NAERA",
    statusBarStyle: "default",
    startupImage: STARTUP_IMAGES.map(({ width, height, ratio, file }) => ({
      url: `/splash/apple-splash-${file}.png`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const storageLabel = process.env.DATABASE_URL ? "Base PostgreSQL" : "Stockage local · démo";
  return (
    <html lang="fr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:shadow-float"
        >
          Aller au contenu
        </a>
        <div className="flex min-h-dvh">
          <Sidebar storageLabel={storageLabel} />
          <div className="min-w-0 flex-1">
            <OfflineBanner />
            <main
              id="contenu"
              className="mx-auto w-full max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
            >
              {children}
            </main>
          </div>
        </div>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
