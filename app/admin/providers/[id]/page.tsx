import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { RejectForm } from "@/components/admin/RejectForm";
import { getServiceProviderProfileDetail } from "@/lib/data/admin";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "بررسی پارتنر تولید",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING: "در انتظار تایید",
  APPROVED: "تایید‌شده",
  REJECTED: "رد‌شده",
} as const;

function parseColors(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminProviderDetailPage({ params }: Props) {
  const { id } = await params;
  const provider = await getServiceProviderProfileDetail(id);
  if (!provider) notFound();

  const offering = provider.serviceOfferings[0];

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="بررسی پارتنر تولید" backHref="/admin/providers" />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-medium text-charcoal">{provider.businessName}</p>
        <p className="text-sm text-charcoal-muted">{STATUS_LABELS[provider.status]}</p>
      </section>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        <div>
          <dt className="text-charcoal-muted">کد ملی</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {provider.nationalId}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">درصد کمیسیون</dt>
          <dd className="font-medium text-charcoal">
            {toNumber(provider.commissionRate).toLocaleString("fa-IR")}٪
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">شماره شبا</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {provider.bankAccountIban}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">تاریخ ثبت‌نام</dt>
          <dd className="font-medium text-charcoal">
            {new Date(provider.createdAt).toLocaleDateString("fa-IR")}
          </dd>
        </div>
      </dl>

      {provider.businessLicenseImageUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">مدارک</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded document, remote/S3 URL */}
          <img
            src={provider.businessLicenseImageUrl}
            alt="مدارک پارتنر"
            className="w-full rounded-2xl border border-border object-cover"
          />
        </div>
      ) : null}

      {offering ? (
        <>
          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <div>
              <dt className="text-charcoal-muted">نوع بادکنک</dt>
              <dd className="font-medium text-charcoal">
                {[offering.supportsChrome && "کروم", offering.supportsMatte && "مات"]
                  .filter(Boolean)
                  .join("، ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-charcoal-muted">حداقل تیراژ</dt>
              <dd className="font-medium text-charcoal">
                {offering.minOrderQuantity?.toLocaleString("fa-IR") ?? "—"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-charcoal-muted">رنگ‌های قابل‌چاپ</dt>
              <dd className="font-medium text-charcoal">
                {parseColors(offering.printableColors).join("، ") || "—"}
              </dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-sm font-medium text-charcoal">تعرفه‌ی پلکانی</p>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-border/40 text-charcoal-muted">
                  <tr>
                    <th className="p-2 text-right font-medium">بازه‌ی تیراژ</th>
                    <th className="p-2 text-right font-medium">قیمت واحد</th>
                  </tr>
                </thead>
                <tbody>
                  {offering.pricingTiers.map((tier) => (
                    <tr key={tier.id} className="border-t border-border">
                      <td dir="ltr" className="p-2 text-right text-charcoal">
                        {tier.minQuantity.toLocaleString("fa-IR")} -{" "}
                        {tier.maxQuantity ? tier.maxQuantity.toLocaleString("fa-IR") : "∞"}
                      </td>
                      <td className="p-2 text-right text-charcoal">
                        {toNumber(tier.unitPrice).toLocaleString("fa-IR")} تومان
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {provider.status === "REJECTED" && provider.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700">
          <p className="font-medium">دلیل رد قبلی</p>
          <p className="mt-1">{provider.rejectionReason}</p>
        </div>
      ) : null}

      {provider.status === "PENDING" ? (
        <div className="mt-auto flex flex-col gap-2">
          <ApproveButton endpoint={`/api/admin/providers/${provider.id}/approve`} label="تایید پارتنر" />
          <RejectForm endpoint={`/api/admin/providers/${provider.id}/reject`} />
        </div>
      ) : null}
    </main>
  );
}
