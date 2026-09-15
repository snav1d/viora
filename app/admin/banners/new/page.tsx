import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { BannerForm } from "@/components/admin/BannerForm";

export const metadata: Metadata = {
  title: "بنر جدید",
  robots: { index: false, follow: false },
};

export default function NewBannerPage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="بنر جدید" backHref="/admin/banners" />
      <BannerForm />
    </main>
  );
}
