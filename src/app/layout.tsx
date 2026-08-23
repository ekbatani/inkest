import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppearanceSync } from "@/components/users/appearance-sync";
import { getUserSettings } from "@/server/users/settings-service";
import { SessionProvider } from "@/components/providers/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };
const lora = { variable: "font-serif" };
const vazirmatn = { variable: "font-rtl-fallback" };

export const viewport: Viewport = {
  themeColor: "#0c0a1f",
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
      className={cn(
        "h-full",
        geistSans.variable,
        geistMono.variable,
        lora.variable,
        vazirmatn.variable,
      )}
    >
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
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </SessionProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
