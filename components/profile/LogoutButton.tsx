"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium text-charcoal-muted hover:bg-rose-50 hover:text-rose-700"
    >
      <LogOut className="h-4 w-4" strokeWidth={1.75} />
      خروج از حساب
    </button>
  );
}
