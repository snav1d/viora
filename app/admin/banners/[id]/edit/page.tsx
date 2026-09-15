import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { BannerForm } from "@/components/admin/BannerForm";
import { getBannerDetail } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "ویرایش بنر",
  robots: { index: false, follow: false },
};

function toIso(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

type Props = { params: Promise<{ id: string }> };

export default async function EditBannerPage({ params }: Props) {
  const { id } = await params;
  const banner = await getBannerDetail(id);
  if (!banner) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="ویرایش بنر" backHref="/admin/banners" />
      <BannerForm
        banner={{
          id: banner.id,
          imageUrl: banner.imageUrl,
          text: banner.text,
          link: banner.link,
          placement: banner.placement,
          startsAt: toIso(banner.startsAt),
          endsAt: toIso(banner.endsAt),
        }}
      />
    </main>
  );
}
