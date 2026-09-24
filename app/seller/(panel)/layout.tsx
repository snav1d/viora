import { redirect } from "next/navigation";
import { Clock3, XCircle, AlertTriangle } from "lucide-react";
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
          <p className="font-medium text-charcoal">به جمع ویورا خوش اومدی!</p>
          <p className="text-sm text-charcoal-muted">
            پس از تایید اطلاعات فروشگاه «{profile.businessName}»، پنل فروشگاهی شما فعال می‌شود.
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
      {profile.status === "SUSPENDED" ? (
        <div className="flex items-start gap-2 border-b border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p>
            فروشگاه شما موقتاً تعلیق شده است و امکان افزودن محصول جدید ندارید. سفارش‌های فعلی شما
            دست‌نخورده باقی می‌مانند و همچنان می‌توانید آن‌ها را پردازش کنید.
          </p>
        </div>
      ) : null}
      {children}
      <SellerNav />
    </div>
  );
}
