import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/home", "/shop"],
      disallow: ["/api/", "/auth", "/auth/", "/wizard", "/cart", "/profile"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
