import type { Metadata } from "next";
import { WizardFlow } from "@/components/wizard/WizardFlow";
import { getActiveCities } from "@/lib/data/catalog";
import themesConfig from "@/config/party-wizard/themes.json";

export const metadata: Metadata = {
  title: "جشن‌ساز",
  description: "با چند سوال ساده، سبد پیشنهادی جشن خود را بسازید.",
  robots: { index: false, follow: false },
};

// Active-city list is admin-editable (phase toggle) and must never be frozen at build time.
export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const cities = await getActiveCities();

  return (
    <main className="flex flex-1 flex-col">
      <WizardFlow
        cities={cities.map((city) => ({ id: city.id, name: city.name }))}
        themes={themesConfig.themes}
      />
    </main>
  );
}
