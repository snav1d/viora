import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { RejectForm } from "@/components/admin/RejectForm";
import { getProductReviewDetail } from "@/lib/data/admin";
import { parseProductImages } from "@/lib/data/seller";
import { PRODUCT_STATUS_LABELS } from "@/lib/labels";
import { toNumber } from "@/lib/decimal";

export const metadata: Metadata = {
  title: "بررسی محصول",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductReviewDetail(id);
  if (!product) notFound();

  const images = parseProductImages(product.images);
  // A brand-new submission has exactly one Listing (the submitter's own terms) at review time -
  // other sellers can only claim a Listing once the Product is already APPROVED (ADR 39).
  const submitterListing = product.listings.find((l) => l.sellerId === product.submittedBySellerId);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-5">
      <TopBar title="بررسی محصول" backHref="/admin/products" />

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-medium text-charcoal">{product.title}</p>
        <p className="text-sm text-charcoal-muted">
          {PRODUCT_STATUS_LABELS[product.status]}
          {product.code ? ` · ${product.code}` : ""}
        </p>
      </section>

      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element -- remote S3-compatible URLs
            <img
              key={url}
              src={url}
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl border border-border object-cover"
            />
          ))}
        </div>
      ) : null}

      {product.description ? (
        <p className="text-sm leading-7 text-charcoal-muted">{product.description}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        <div className="col-span-2">
          <dt className="text-charcoal-muted">دسته‌بندی</dt>
          <dd className="font-medium text-charcoal">{product.category.name}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-charcoal-muted">ارسال‌شده توسط</dt>
          <dd className="font-medium text-charcoal">
            {product.submittedBySeller?.businessName ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-charcoal-muted">تاریخ ارسال</dt>
          <dd className="font-medium text-charcoal">
            {new Date(product.createdAt).toLocaleDateString("fa-IR")}
          </dd>
        </div>
      </dl>

      {submitterListing ? (
        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-charcoal-muted">شرایط فروشنده</dt>
          </div>
          <div>
            <dt className="text-charcoal-muted">شهر</dt>
            <dd className="font-medium text-charcoal">{submitterListing.city.name}</dd>
          </div>
          <div>
            <dt className="text-charcoal-muted">موجودی</dt>
            <dd className="font-medium text-charcoal">
              {submitterListing.stock.toLocaleString("fa-IR")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-charcoal-muted">قیمت</dt>
            <dd className="font-medium text-charcoal">
              {submitterListing.discountPrice ? (
                <>
                  {toNumber(submitterListing.discountPrice).toLocaleString("fa-IR")} تومان{" "}
                  <span className="text-charcoal-muted line-through">
                    {toNumber(submitterListing.price).toLocaleString("fa-IR")}
                  </span>
                </>
              ) : (
                `${toNumber(submitterListing.price).toLocaleString("fa-IR")} تومان`
              )}
            </dd>
          </div>
        </dl>
      ) : null}

      {product.status !== "PENDING_REVIEW" && product.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700">
          <p className="font-medium">دلیل قبلی</p>
          <p className="mt-1">{product.rejectionReason}</p>
        </div>
      ) : null}

      {product.status === "PENDING_REVIEW" ? (
        <div className="mt-auto flex flex-col gap-2">
          <ApproveButton endpoint={`/api/admin/products/${product.id}/approve`} label="تایید محصول" />
          <RejectForm
            endpoint={`/api/admin/products/${product.id}/request-revision`}
            triggerLabel="نیاز به بازبینی"
            reasonLabel="توضیح برای فروشنده - چه چیزی باید اصلاح شود"
            submitLabel="ثبت و بازگرداندن به فروشنده"
          />
          <RejectForm endpoint={`/api/admin/products/${product.id}/reject`} />
        </div>
      ) : null}
    </main>
  );
}
