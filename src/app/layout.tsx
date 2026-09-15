import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceSync } from "@/components/users/appearance-sync";
import { getUserSettings } from "@/server/users/settings-service";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

export const viewport: Viewport = {
  themeColor: "#0b0d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Inkest — a calm, Markdown-first workspace",
    template: "%s · Inkest",
  },
  description:
    "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/app-icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
      { url: "/logo-square.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inkest",
  },
  openGraph: {
    title: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
    siteName: "Inkest",
    type: "website",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "Inkest — Markdown workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
    images: ["/banner.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getUserSettings();
  const theme = settings.theme;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full"
      data-palette={theme?.palette ?? "paper"}
      data-font={theme?.font ?? "sans"}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Lalezar&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Space+Grotesk:wght@300..700&family=Vazirmatn:wght@100..900&display=swap"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/font-face.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/shabnam-font@v5.6.1/dist/font-face.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/samim-font@v4.0.5/dist/font-face.css" />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppearanceSync
            preference={theme?.preference ?? "system"}
            palette={theme?.palette ?? "paper"}
            font={theme?.font ?? "sans"}
          />
          <SessionProvider>
            {children}
          </SessionProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
