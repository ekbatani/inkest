"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export type AppearanceTheme = "system" | "light" | "dark";
export type AppearancePalette =
  | "paper"
  | "forest"
  | "violet"
  | "amber"
  | "nord"
  | "rose"
  | "terracotta"
  | "midnight";
export type AppearanceFont =
  | "sans"
  | "serif"
  | "mono"
  | "persian"
  | "persian-sahel"
  | "persian-shabnam"
  | "persian-samim"
  | "persian-amiri"
  | "persian-lalezar"
  | "persian-nastaliq"
  | "persian-noto"
  | "slab"
  | "typewriter"
  | "grotesk"
  | "baskerville"
  | "persian-serif";

export interface PaletteDefinition {
  id: AppearancePalette;
  name: string;
  desc: string;
  colorDot: string;
  bgClass: string;
  borderClass: string;
  accentClass: string;
}

export const PALETTES: PaletteDefinition[] = [
  {
    id: "paper",
    name: "Paper",
    desc: "Warm minimalist journal",
    colorDot: "bg-blue-500",
    bgClass: "bg-[#fbfbf9] dark:bg-[#1a1b1e]",
    borderClass: "border-border",
    accentClass: "bg-blue-600 dark:bg-blue-400",
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Calming botanical moss",
    colorDot: "bg-emerald-500",
    bgClass: "bg-[#f5f8f5] dark:bg-[#16201a]",
    borderClass: "border-emerald-700/20",
    accentClass: "bg-emerald-600 dark:bg-emerald-400",
  },
  {
    id: "violet",
    name: "Violet",
    desc: "Atmospheric violet dusk",
    colorDot: "bg-purple-500",
    bgClass: "bg-[#f9f7fb] dark:bg-[#1d1825]",
    borderClass: "border-purple-700/20",
    accentClass: "bg-purple-600 dark:bg-purple-400",
  },
  {
    id: "amber",
    name: "Amber",
    desc: "Warm parchment & honey",
    colorDot: "bg-amber-500",
    bgClass: "bg-[#fcf9f2] dark:bg-[#1f1b15]",
    borderClass: "border-amber-700/20",
    accentClass: "bg-amber-600 dark:bg-amber-400",
  },
  {
    id: "nord",
    name: "Nord",
    desc: "Arctic frost & slate",
    colorDot: "bg-sky-500",
    bgClass: "bg-[#f4f7f9] dark:bg-[#151c24]",
    borderClass: "border-sky-700/20",
    accentClass: "bg-sky-600 dark:bg-sky-400",
  },
  {
    id: "rose",
    name: "Rose",
    desc: "Earthy blush & crimson",
    colorDot: "bg-rose-500",
    bgClass: "bg-[#fcf6f7] dark:bg-[#221719]",
    borderClass: "border-rose-700/20",
    accentClass: "bg-rose-600 dark:bg-rose-400",
  },
  {
    id: "terracotta",
    name: "Terracotta",
    desc: "Sun-baked clay & copper",
    colorDot: "bg-orange-500",
    bgClass: "bg-[#faf6f2] dark:bg-[#201915]",
    borderClass: "border-orange-700/20",
    accentClass: "bg-orange-600 dark:bg-orange-400",
  },
  {
    id: "midnight",
    name: "Midnight",
    desc: "Tokyo dusk & neon indigo",
    colorDot: "bg-indigo-500",
    bgClass: "bg-[#f6f6fc] dark:bg-[#11111e]",
    borderClass: "border-indigo-700/20",
    accentClass: "bg-indigo-600 dark:bg-indigo-400",
  },
];

export interface FontDefinition {
  id: AppearanceFont;
  name: string;
  nativeName: string;
  category: "persian" | "latin";
  tag: string;
  description: string;
  sample: string;
  sampleEn?: string;
  fontFamily: string;
}

export const FONTS: FontDefinition[] = [
  // Persian fonts
  {
    id: "persian",
    name: "Vazirmatn",
    nativeName: "وزیرمتن",
    category: "persian",
    tag: "Persian Sans · استاندارد وب",
    description: "قلم استاندارد، هندسی و تمیز برای رابط کاربری و مقالات فارسی",
    sample: "زیبایی در سادگی و وضوح اندیشه است · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Simplicity is prerequisite for reliability · 12345",
    fontFamily: "var(--font-vazirmatn), 'Vazirmatn', 'Vazir', sans-serif",
  },
  {
    id: "persian-sahel",
    name: "Sahel",
    nativeName: "ساحل",
    category: "persian",
    tag: "Humanist Sans · نرم و روان",
    description: "طراحی نرم، گرم و چشم‌نواز با خوانایی بسیار بالا در متون طولانی",
    sample: "آرامش در تفکر و ثبت بی‌دغدغه ایده‌ها · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Calm writing and mindful reflection · 12345",
    fontFamily: "'Sahel', var(--font-vazirmatn), 'Vazirmatn', sans-serif",
  },
  {
    id: "persian-shabnam",
    name: "Shabnam",
    nativeName: "شبنم",
    category: "persian",
    tag: "Geometric Sans · مدرن و دقیق",
    description: "ساختار هندسی، استوار و مدرن مناسب یادداشت‌های فنی و مقالات",
    sample: "نظم در یادداشت‌ها، شفافیت در تصمیم‌گیری · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Structured notes and clear decisions · 12345",
    fontFamily: "'Shabnam', var(--font-vazirmatn), 'Vazirmatn', sans-serif",
  },
  {
    id: "persian-samim",
    name: "Samim",
    nativeName: "صمیم",
    category: "persian",
    tag: "Friendly Sans · صمیمی و منعطف",
    description: "قلمی صمیمی، گرد و دوستانه مناسب ژورنال‌نویسی و بازتاب‌های روزانه",
    sample: "نوشتن روزانه، دریچه‌ای به شناخت درون · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Daily reflections and personal thoughts · 12345",
    fontFamily: "'Samim', var(--font-vazirmatn), 'Vazirmatn', sans-serif",
  },
  {
    id: "persian-amiri",
    name: "Amiri",
    nativeName: "امیری",
    category: "persian",
    tag: "Classic Naskh · نسخ ادبی",
    description: "تایپوگرافی اصیل و کلاسیک نسخ برای متون ادبی، فلسفی و تاریخی",
    sample: "درخت دوستی بنشان که کام دل به بار آرد · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Classic literary typography and prose · 12345",
    fontFamily: "'Amiri', 'Scheherazade New', serif",
  },
  {
    id: "persian-lalezar",
    name: "Lalezar",
    nativeName: "لاله‌زار",
    category: "persian",
    tag: "Display Title · تیتر و نمایشی",
    description: "قلم نوستالژیک و پرانرژی برای عناوین بزرگ، یادداشت‌های الهام‌بخش و پوستر",
    sample: "معماری افکار و خلق ایده‌های نو · ۱۲۳۴۵",
    sampleEn: "Bold expressive headlines and titles · 12345",
    fontFamily: "'Lalezar', 'B Titr', 'Titr', sans-serif",
  },
  {
    id: "persian-nastaliq",
    name: "IranNastaliq",
    nativeName: "ایران‌نستعلیق",
    category: "persian",
    tag: "Calligraphy · خط نستعلیق اصیل",
    description: "عروس خطوط ایرانی؛ خوشنویسی ناب برای اشعار، یادداشت‌های هنری و نقل‌قول‌ها",
    sample: "هر دم از این باغ بری می‌رسد · تازه‌تر از تازه‌تری می‌رسد",
    sampleEn: "Poetic Persian calligraphy and verse",
    fontFamily: "'IranNastaliq', 'Iran Nastaliq', 'Urdu Typesetting', cursive, serif",
  },
  {
    id: "persian-noto",
    name: "Noto Naskh",
    nativeName: "نوتو نسخ",
    category: "persian",
    tag: "Formal Naskh · رسمی و آکادمیک",
    description: "تایپوگرافی رسمی و استاندارد بین‌المللی گوگل با هماهنگی عالی حروفی",
    sample: "پژوهش و نگارش ساختاریافته در یک فضای آرام · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Formal academic notes and research · 12345",
    fontFamily: "'Noto Naskh Arabic', 'Amiri', serif",
  },
  {
    id: "persian-serif",
    name: "B Nazanin",
    nativeName: "بی‌نازنین",
    category: "persian",
    tag: "Traditional Serif · مطبوعاتی و کتابی",
    description: "قلم سنتی و خاطره‌انگیز کتاب‌ها، روزنامه‌ها و انتشارات دانشگاهی ایران",
    sample: "مطالعه و بررسی منابع با فرمت اصیل کتابی · ۱۲۳۴۵۶۷۸۹۰",
    sampleEn: "Traditional editorial publishing font · 12345",
    fontFamily: "'B Nazanin', 'Sahel', 'Vazirmatn', serif",
  },

  // Latin fonts
  {
    id: "sans",
    name: "Geist Sans",
    nativeName: "Clean Sans",
    category: "latin",
    tag: "Clean Sans · Modern Default",
    description: "Clean, ultra-legible contemporary sans designed for modern interfaces",
    sample: "The quick brown fox jumps over the lazy dog · 1234567890",
    sampleEn: "The quick brown fox jumps over the lazy dog · 1234567890",
    fontFamily: "var(--font-sans-default), 'Geist', system-ui, sans-serif",
  },
  {
    id: "serif",
    name: "Lora Serif",
    nativeName: "Editorial Serif",
    category: "latin",
    tag: "Literary Serif · Editorial Feel",
    description: "Contemporary serif with brushed curves, perfect for essayists and book notes",
    sample: "Writing is thinking made visible through quiet deliberate prose · 1234567890",
    sampleEn: "Writing is thinking made visible through quiet deliberate prose · 1234567890",
    fontFamily: "'Lora', var(--font-serif), Georgia, serif",
  },
  {
    id: "mono",
    name: "Geist Mono",
    nativeName: "Code Mono",
    category: "latin",
    tag: "Monospace · Code & Markdown",
    description: "Crisp fixed-width font engineered for markdown blocks and technical thinking",
    sample: "const flow = compose(observe, distill, articulate); // 1234567890",
    sampleEn: "const flow = compose(observe, distill, articulate); // 1234567890",
    fontFamily: "var(--font-mono), 'Geist Mono', monospace",
  },
  {
    id: "slab",
    name: "Merriweather",
    nativeName: "Humanist Slab",
    category: "latin",
    tag: "Slab Serif · High Contrast",
    description: "Sturdy serifs with pleasant reading rhythm designed for long-form screens",
    sample: "Clarity of expression comes from clarity of thought · 1234567890",
    sampleEn: "Clarity of expression comes from clarity of thought · 1234567890",
    fontFamily: "'Merriweather', var(--font-slab), Georgia, serif",
  },
  {
    id: "typewriter",
    name: "Courier Prime",
    nativeName: "Classic Typewriter",
    category: "latin",
    tag: "Typewriter · Nostalgic Focus",
    description: "Mechanical nostalgia recreating the rhythm of vintage distraction-free typewriters",
    sample: "Ink on paper: drafting thoughts in their rawest purest state · 1234567890",
    sampleEn: "Ink on paper: drafting thoughts in their rawest purest state · 1234567890",
    fontFamily: "'Courier Prime', var(--font-typewriter), monospace",
  },
  {
    id: "grotesk",
    name: "Space Grotesk",
    nativeName: "Modern Grotesk",
    category: "latin",
    tag: "Geometric Grotesk · Punchy",
    description: "Distinctive geometric personality with crisp angles and editorial character",
    sample: "Form follows function, architecture follows intention · 1234567890",
    sampleEn: "Form follows function, architecture follows intention · 1234567890",
    fontFamily: "'Space Grotesk', var(--font-grotesk), sans-serif",
  },
  {
    id: "baskerville",
    name: "Baskerville",
    nativeName: "Academic Classic",
    category: "latin",
    tag: "Academic Classic · Traditional",
    description: "Centuries-old transitional serif with elegance fit for scholarship and archives",
    sample: "Preserving human knowledge through structured interconnected notes · 1234567890",
    sampleEn: "Preserving human knowledge through structured interconnected notes · 1234567890",
    fontFamily: "'Libre Baskerville', var(--font-baskerville), 'Baskerville', serif",
  },
];

export function applyPalette(palette: AppearancePalette) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.palette = palette;
  localStorage.setItem("inkest-palette", palette);
  window.dispatchEvent(new CustomEvent("inkest:palette-change", { detail: { palette } }));
}

export function applyFont(font: AppearanceFont) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.font = font;
  localStorage.setItem("inkest-font", font);
  window.dispatchEvent(new CustomEvent("inkest:font-change", { detail: { font } }));
}

export function applyAppearance({ palette, font }: { palette: AppearancePalette; font: AppearanceFont }) {
  applyPalette(palette);
  applyFont(font);
}

export function AppearanceSync({ preference, palette, font }: { preference: AppearanceTheme; palette: AppearancePalette; font: AppearanceFont }) {
  const { setTheme } = useTheme();
  React.useEffect(() => {
    setTheme(preference);
    applyAppearance({ palette, font });
  }, [font, palette, preference, setTheme]);
  return null;
}
