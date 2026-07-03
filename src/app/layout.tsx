import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora, Vazirmatn } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const vazirmatn = Vazirmatn({
  variable: "--font-rtl-fallback",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Inkest — a calm, Markdown-first workspace",
    template: "%s · Inkest",
  },
  description:
    "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
  openGraph: {
    title: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
    siteName: "Inkest",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Inkest",
    description:
      "A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and AI actions — self-hosted or cloud.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </SessionProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
