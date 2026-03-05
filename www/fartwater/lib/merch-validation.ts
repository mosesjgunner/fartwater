export type ShippingDetails = {
  shippingName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostal: string;
  shippingCountry: string;
};

function normalizeText(value: unknown, maxLength: number, minLength = 1) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) return null;
  return normalized;
}

function normalizeEmail(value: unknown) {
  const email = normalizeText(value, 120);
  if (!email) return null;
  const simpleEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simpleEmailPattern.test(email)) return null;
  return email.toLowerCase();
}

export function parseShippingDetails(payload: any): { ok: true; shipping: ShippingDetails } | { ok: false; error: string } {
  const shippingName = normalizeText(payload?.shippingName, 100);
  const shippingEmail = normalizeEmail(payload?.shippingEmail);
  const shippingLine1 = normalizeText(payload?.shippingLine1, 120);
  const shippingLine2 = payload?.shippingLine2
    ? normalizeText(payload.shippingLine2, 120, 0)
    : null;
  const shippingCity = normalizeText(payload?.shippingCity, 80);
  const shippingState = normalizeText(payload?.shippingState, 80);
  const shippingPostal = normalizeText(payload?.shippingPostal, 20);
  const shippingCountry = normalizeText(payload?.shippingCountry, 2)?.toUpperCase() ?? null;

  if (!shippingName) return { ok: false, error: 'Invalid shippingName' };
  if (!shippingEmail) return { ok: false, error: 'Invalid shippingEmail' };
  if (!shippingLine1) return { ok: false, error: 'Invalid shippingLine1' };
  if (!shippingCity) return { ok: false, error: 'Invalid shippingCity' };
  if (!shippingState) return { ok: false, error: 'Invalid shippingState' };
  if (!shippingPostal) return { ok: false, error: 'Invalid shippingPostal' };
  if (!shippingCountry) return { ok: false, error: 'Invalid shippingCountry (use 2-letter code)' };

  return {
    ok: true,
    shipping: {
      shippingName,
      shippingEmail,
      shippingLine1,
      shippingLine2,
      shippingCity,
      shippingState,
      shippingPostal,
      shippingCountry,
    },
  };
}
