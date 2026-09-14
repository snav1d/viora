/**
 * Built-in avatar choices for the seller registration wizard's step 1 ("انتخاب آواتار"). A
 * placeholder set of 12 simple geometric SVGs (public/avatars/*.svg) in the Champagne Rose
 * palette, enough to exercise the picker end to end - the full 50 lands later. See
 * docs/decisions.md ADR 29.
 *
 * Plain static files, not database rows: nothing about which avatars exist is a per-deploy or
 * per-city configuration choice, so this doesn't need the "admin-editable, never hardcoded"
 * treatment the rest of this app's business data gets (00-START-HERE.md §0.5) - it's a design
 * asset list, the same category as an icon set.
 */
export const DEFAULT_AVATARS = Array.from({ length: 12 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  return { id, url: `/avatars/avatar-${id}.svg` };
});
