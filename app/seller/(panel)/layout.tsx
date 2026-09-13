import { redirect } from "next/navigation";
import { Clock3, XCircle } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { SellerNav } from "@/components/seller/SellerNav";
import { getSession } from "@/lib/auth/session";
import { getSellerProfile } from "@/lib/auth/seller";

// SellerProfile.status is admin-edited directly in the database for now (no admin panel yet -
// docs/decisions.md ADR 27), so it must be read fresh on every request, never cached/frozen at
// build time - same reasoning as every other phase-toggle page in this app.
export const dynamic = "force-dynamic";

export default async function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fseller");
  }

  const profile = await getSellerProfile();
  if (!profile) {
    redirect("/seller/register");
  }

  if (profile.status === "PENDING") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar title="پنل فروشنده" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-600">
            <Clock3 className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="font-medium text-charcoal">درخواست شما در انتظار تایید است</p>
          <p className="text-sm text-charcoal-muted">
            بعد از بررسی و تایید حساب فروشگاه «{profile.businessName}»، دسترسی کامل به پنل فروشنده
            برای شما فعال می‌شود.
          </p>
        </div>
      </main>
    );
  }

  if (profile.status === "REJECTED") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar title="پنل فروشنده" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="font-medium text-charcoal">درخواست فروشندگی شما رد شده است</p>
          {profile.rejectionReason ? (
            <p className="text-sm text-charcoal-muted">{profile.rejectionReason}</p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-20">
      {children}
      <SellerNav />
    </div>
  );
}
