/// Portfolio size constants shared by both server code (upload/list routes, panel pages) and
/// client wizard components - kept in a plain file with no "server-only" import so both sides can
/// use the exact same numbers. See docs/decisions.md ADR 43, 44.

/// Ongoing cap once a provider is approved and managing their own portfolio from the panel.
export const MAX_PORTFOLIO_IMAGES = 15;

/// Minimum required at registration time, before a provider's identity/license info can even be
/// submitted for admin review (docs/decisions.md ADR 44) - these same photos become the
/// provider's initial portfolio the moment they're approved (editable/removable afterward, up to
/// MAX_PORTFOLIO_IMAGES, from /provider/portfolio).
export const MIN_REGISTRATION_PORTFOLIO_IMAGES = 5;
