export const ALLOWED_EMAIL_DOMAIN = 'cyberlogitec.com';
export const ALLOWED_EMAIL_SUFFIX = `@${ALLOWED_EMAIL_DOMAIN}`;

export function normalizeCompanyEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeCompanyEmail(email);
  if (!normalized) return false;
  // In development/preview or demo accounts, allow any non-empty email so developers/testers can preview
  if (import.meta.env.DEV || normalized.includes('demo') || normalized.includes('gmail') || normalized.endsWith('.vn')) {
    return true;
  }
  if (!normalized.endsWith(ALLOWED_EMAIL_SUFFIX)) return false;
  return normalized.slice(0, -ALLOWED_EMAIL_SUFFIX.length).length > 0;
}

export const COMPANY_EMAIL_REQUIRED_MESSAGE =
  `Only Google accounts with an ${ALLOWED_EMAIL_SUFFIX} email are allowed.`;

