import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/lib/config/site";
import { CartProvider } from "@/lib/cart/CartContext";
import { getEffectiveTheme } from "@/lib/data/theme";
import { isValidPalette, paletteToCssVars } from "@/lib/theme";
import { ThemePreviewBanner } from "@/components/admin/ThemePreviewBanner";
import "./globals.css";

// Self-hosted (docs/decisions.md ADR 45's project-self-sufficiency rule, same reasoning as every
// other self-hosted asset in this app) - replaces Vazirmatn as the site-wide default. Kalameh
// ships nine static weights; only the four the codebase actually uses in a Tailwind font-weight
// class (font-medium/font-semibold/font-bold) or as body text's own default weight (regular) are
// loaded, so a customer's first paint isn't waiting on five weights nothing ever renders in.
const kalameh = localFont({
  src: [
    { path: "./fonts/Kalameh-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Kalameh-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Kalameh-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Kalameh-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-kalameh",
  display: "swap",
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
      className={`${kalameh.variable} h-full`}
      style={paletteStyle}
    >
      <body className="min-h-full flex flex-col bg-warm-white text-charcoal antialiased">
        {isPreview && theme ? <ThemePreviewBanner themeName={theme.name} /> : null}
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
