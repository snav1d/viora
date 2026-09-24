"use client";

import { cn } from "@/lib/cn";

/// Horizontal pill-tab filter (docs/design-system.md §6) - replaces a plain <select> or a stack
/// of secondary buttons anywhere a customer picks one of a few categories/filters. Active =
/// solid charcoal; inactive = surface with a border. Scrolls horizontally when it overflows,
/// same "-mx-4 px-4" edge-bleed pattern already used by PromoStrip/FeaturedProviderStrip.
export function CapsuleTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-charcoal text-warm-white"
                : "border border-border bg-surface text-charcoal hover:border-charcoal/30",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
