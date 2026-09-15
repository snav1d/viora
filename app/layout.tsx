import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { siteConfig } from "@/lib/config/site";
import { CartProvider } from "@/lib/cart/CartContext";
import { getEffectiveTheme } from "@/lib/data/theme";
import { isValidPalette, paletteToCssVars } from "@/lib/theme";
import { ThemePreviewBanner } from "@/components/admin/ThemePreviewBanner";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Site-wide seasonal palette override (docs/decisions.md ADR 36) - either the theme live today
  // by date window, or an admin's own preview of a not-yet-public one (never affects other
  // visitors). Applied as an inline style on <html> so it overrides app/globals.css's `@theme`
  // tokens by specificity, without touching <head> (Next's Metadata API owns that).
  const { theme, isPreview } = await getEffectiveTheme();
  const paletteStyle =
    theme && isValidPalette(theme.palette) ? paletteToCssVars(theme.palette) : undefined;

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full`}
      style={paletteStyle}
    >
      <body className="min-h-full flex flex-col bg-warm-white text-charcoal antialiased">
        {isPreview && theme ? <ThemePreviewBanner themeName={theme.name} /> : null}
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
