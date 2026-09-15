import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ApproveSellerButton } from "@/components/admin/ApproveSellerButton";
import { RejectSellerForm } from "@/components/admin/RejectSellerForm";
import { getSellerProfileDetail } from "@/lib/data/admin";
import { REFERRAL_SOURCES } from "@/lib/seller/registration";

export const metadata: Metadata = {
  title: "بررسی فروشنده",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING: "در انتظار تایید",
  APPROVED: "تایید‌شده",
  REJECTED: "رد‌شده",
} as const;

function parsePhoneNumbers(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminSellerDetailPage({ params }: Props) {
  const { id } = await params;
  const seller = await getSellerProfileDetail(id);
  if (!seller) notFound();

  const phoneNumbers = parsePhoneNumbers(seller.phoneNumbers);
  const referralLabel =
    REFERRAL_SOURCES.find((option) => option.value === seller.referralSource)?.label ??
    seller.referralSource;

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="بررسی فروشنده" backHref="/admin/sellers" />

      <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        {seller.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static avatar or remote/S3 URL
          <img src={seller.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : null}
        <div>
          <p className="font-medium text-charcoal">{seller.businessName}</p>
          <p className="text-sm text-charcoal-muted">{STATUS_LABELS[seller.status]}</p>
        </div>
      </section>

      {seller.description ? (
        <p className="text-sm leading-7 text-charcoal-muted">{seller.description}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        <div className="col-span-2">
          <dt className="text-charcoal-muted">دسته‌بندی‌ها</dt>
          <dd className="font-medium text-charcoal">
            {seller.categories.map((c) => c.category.name).join("، ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">شهر</dt>
          <dd className="font-medium text-charcoal">{seller.city?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">تاریخ ثبت‌نام</dt>
          <dd className="font-medium text-charcoal">
            {new Date(seller.createdAt).toLocaleDateString("fa-IR")}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">کد ملی</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {seller.nationalId}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">شناسه‌ی صنفی</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {seller.unionId ?? "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">شماره شبا</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {seller.bankAccountIban}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">آدرس</dt>
          <dd className="font-medium text-charcoal">{seller.address ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">شماره‌های تماس</dt>
          <dd dir="ltr" className="text-left font-medium text-charcoal">
            {phoneNumbers.length > 0 ? phoneNumbers.join("، ") : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">آشنایی با ویورا</dt>
          <dd className="font-medium text-charcoal">
            {referralLabel ?? "—"}
            {seller.referralSource === "other" && seller.referralSourceOther
              ? ` (${seller.referralSourceOther})`
              : ""}
          </dd>
        </div>
      </dl>

      {seller.businessLicenseImageUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">عکس پروانه‌ی کسب</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded document, remote/S3 URL */}
          <img
            src={seller.businessLicenseImageUrl}
            alt="پروانه‌ی کسب"
            className="w-full rounded-2xl border border-border object-cover"
          />
        </div>
      ) : null}

      {seller.status === "REJECTED" && seller.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700">
          <p className="font-medium">دلیل رد قبلی</p>
          <p className="mt-1">{seller.rejectionReason}</p>
        </div>
      ) : null}

      {seller.status === "PENDING" ? (
        <div className="mt-auto flex flex-col gap-2">
          <ApproveSellerButton sellerId={seller.id} />
          <RejectSellerForm sellerId={seller.id} />
        </div>
      ) : null}
    </main>
  );
}
