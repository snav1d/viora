import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { AdminNav } from "@/components/admin/AdminNav";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/admin";

// Same reasoning as the seller panel: admin access is determined by a DB row (User.roles) that
// can change at any time (an admin's own role could be revoked by editing the database), so this
// must never be cached/frozen at build time.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fadmin");
  }

  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar title="پنل ادمین" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="font-medium text-charcoal">دسترسی به این بخش محدود است</p>
          <p className="text-sm text-charcoal-muted">
            این حساب کاربری دسترسی ادمین ندارد.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-20">
      {children}
      <AdminNav />
    </div>
  );
}
