import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPrintColorNames, getPrintDeliverySettings } from "@/lib/data/print";
import { PrintOrderFlow } from "@/components/print/PrintOrderFlow";

export const metadata: Metadata = {
  title: "سفارش چاپ بادکنک",
  robots: { index: false, follow: false },
};

// Available colors/delivery settings are admin/partner-editable and must never be frozen at
// build time - same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ offering?: string }> };

export default async function PrintOrderPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fprint");
  }

  const { offering } = await searchParams;

  const [colors, deliverySettings] = await Promise.all([
    getPrintColorNames(),
    getPrintDeliverySettings(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <PrintOrderFlow colors={colors} deliverySettings={deliverySettings} preselectedOfferingId={offering} />
    </main>
  );
}
