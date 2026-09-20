import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { PortfolioManager } from "@/components/provider/PortfolioManager";
import { getServiceProviderProfile } from "@/lib/auth/provider";
import { getProviderPortfolio } from "@/lib/data/provider";
import { MAX_PORTFOLIO_IMAGES } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "پورتفولیو",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProviderPortfolioPage() {
  // Never null here: the (panel) layout already redirected/blocked every other case before
  // rendering this page.
  const profile = (await getServiceProviderProfile())!;
  const images = await getProviderPortfolio(profile.id);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="پورتفولیو" backHref="/provider" />
      <PortfolioManager
        initialImages={images.map((image) => ({ id: image.id, imageUrl: image.imageUrl }))}
        maxImages={MAX_PORTFOLIO_IMAGES}
      />
    </main>
  );
}
