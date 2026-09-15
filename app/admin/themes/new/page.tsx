import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { ThemeForm } from "@/components/admin/ThemeForm";

export const metadata: Metadata = {
  title: "تم جدید",
  robots: { index: false, follow: false },
};

export default function NewThemePage() {
  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="تم جدید" backHref="/admin/themes" />
      <ThemeForm />
    </main>
  );
}
