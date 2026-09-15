import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ThemeForm } from "@/components/admin/ThemeForm";
import { getSeasonalThemeDetail } from "@/lib/data/admin";
import { CHAMPAGNE_ROSE_PALETTE, isValidPalette } from "@/lib/theme";

export const metadata: Metadata = {
  title: "ویرایش تم",
  robots: { index: false, follow: false },
};

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type Props = { params: Promise<{ id: string }> };

export default async function EditThemePage({ params }: Props) {
  const { id } = await params;
  const theme = await getSeasonalThemeDetail(id);
  if (!theme) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title="ویرایش تم" backHref="/admin/themes" />
      <ThemeForm
        theme={{
          id: theme.id,
          name: theme.name,
          palette: isValidPalette(theme.palette) ? theme.palette : CHAMPAGNE_ROSE_PALETTE,
          startsAt: toIso(theme.startsAt),
          endsAt: toIso(theme.endsAt),
        }}
      />
    </main>
  );
}
