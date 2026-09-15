import { redirect } from "next/navigation";
import { Clock3, XCircle } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { ProviderNav } from "@/components/provider/ProviderNav";
import { getSession } from "@/lib/auth/session";
import { getServiceProviderProfile } from "@/lib/auth/provider";

// ServiceProviderProfile.status is admin-edited (approved/rejected from /admin/providers), so it
// must be read fresh on every request - same reasoning as the seller panel layout (ADR 27).
export const dynamic = "force-dynamic";

export default async function ProviderPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/auth?redirect=%2Fprovider");
  }

  const profile = await getServiceProviderProfile();
  if (!profile) {
    redirect("/provider/register");
  }

  if (profile.status === "PENDING") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar title="پنل پارتنر تولید" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-600">
            <Clock3 className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="font-medium text-charcoal">به جمع ویورا خوش اومدی!</p>
          <p className="text-sm text-charcoal-muted">
            پس از تایید اطلاعات «{profile.businessName}»، پنل پارتنری شما فعال می‌شود.
          </p>
        </div>
      </main>
    );
  }

  if (profile.status === "REJECTED") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <TopBar title="پنل پارتنر تولید" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="font-medium text-charcoal">درخواست همکاری شما رد شده است</p>
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
      <ProviderNav />
    </div>
  );
}
