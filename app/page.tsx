import type { Metadata } from "next";
import { OnboardingCarousel } from "@/components/auth/OnboardingCarousel";

export const metadata: Metadata = {
  title: "خوش آمدید",
};

export default function SplashPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <OnboardingCarousel />
    </main>
  );
}
