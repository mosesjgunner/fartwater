const PRINTIFY_API_BASE = 'https://api.printify.com/v1';
const PRINTIFY_REQUEST_TIMEOUT_MS = 12000;
const PRINTIFY_CACHE_TTL_MS = 5 * 60 * 1000;

type PrintifyShop = {
  id: number | string;
  title?: string;
};

type PrintifyVariant = {
  price?: number;
  is_enabled?: boolean;
  is_available?: boolean;
  currency?: string;
};

type PrintifyImage = {
  src?: string;
  is_default?: boolean;
};

type PrintifyProduct = {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  visible?: boolean;
  images?: PrintifyImage[];
  variants?: PrintifyVariant[];
  external?: {
    handle?: string;
  };
};

type PrintifyProductsResponse = {
  data?: PrintifyProduct[];
};

export type PrintifyCatalogProduct = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  variantCount: number;
  priceFromCents: number | null;
  currency: string;
  priceLabel: string;
  productUrl: string | null;
};

export type PrintifyCatalog = {
  shopId: string;
  shopTitle: string;
  storefrontUrl: string | null;
  fetchedAtUnix: number;
  cached: boolean;
  products: PrintifyCatalogProduct[];
};

type PrintifyCatalogCacheEntry = {
  expiresAt: number;
  value: Omit<PrintifyCatalog, 'cached'>;
};

let printifyCatalogCache: PrintifyCatalogCacheEntry | null = null;

export class PrintifyConfigError extends Error {}
export class PrintifyRequestError extends Error {}

function getPrintifyToken() {
  const token = process.env.PRINTIFY_API_TOKEN?.trim();
  if (!token) {
    throw new PrintifyConfigError('Printify is not configured. Missing PRINTIFY_API_TOKEN.');
  }
  return token;
}

function normalizeStorefrontUrl(rawUrl: string | undefined) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const normalized = new URL(trimmed);
    if (normalized.protocol !== 'https:' && normalized.protocol !== 'http:') return null;
    return normalized.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== 'string') return 'USD';
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return 'USD';
  return normalized;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPriceFromCents(value: number | null, currency: string) {
  if (!Number.isFinite(value) || value === null || value < 0) return 'Price unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function buildProductUrl(storefrontUrl: string | null, handle: string | undefined) {
  const trimmedHandle = typeof handle === 'string' ? handle.trim() : '';
  if (trimmedHandle && /^https?:\/\//i.test(trimmedHandle)) {
    return trimmedHandle;
  }

  if (!storefrontUrl) return null;
  if (!trimmedHandle) return storefrontUrl;

  const path = trimmedHandle.startsWith('/')
    ? trimmedHandle
    : trimmedHandle.includes('/')
      ? `/${trimmedHandle}`
      : `/products/${trimmedHandle}`;

  try {
    return new URL(path, `${storefrontUrl}/`).toString();
  } catch {
    return storefrontUrl;
  }
}

async function fetchPrintifyJson<T>(path: string, token: string) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), PRINTIFY_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PRINTIFY_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new PrintifyRequestError(`Printify request failed (${response.status}) for ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof PrintifyRequestError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PrintifyRequestError(`Printify request timed out for ${path}`);
    }
    throw new PrintifyRequestError(`Printify request failed for ${path}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveShop(token: string) {
  const preferredShopId = process.env.PRINTIFY_SHOP_ID?.trim();
  const shops = await fetchPrintifyJson<PrintifyShop[]>('/shops.json', token);

  if (!Array.isArray(shops) || shops.length === 0) {
    throw new PrintifyRequestError('No Printify shops were found for this account.');
  }

  if (preferredShopId) {
    const found = shops.find((shop) => String(shop.id) === preferredShopId);
    if (!found) {
      throw new PrintifyConfigError(
        `PRINTIFY_SHOP_ID=${preferredShopId} was not found on this Printify account.`
      );
    }
    return {
      id: String(found.id),
      title: typeof found.title === 'string' && found.title.trim() ? found.title.trim() : 'Printify Shop',
    };
  }

  const firstShop = shops[0];
  return {
    id: String(firstShop.id),
    title:
      typeof firstShop.title === 'string' && firstShop.title.trim()
        ? firstShop.title.trim()
        : 'Printify Shop',
  };
}

function mapPrintifyProducts(rawProducts: PrintifyProduct[], storefrontUrl: string | null) {
  const mapped: PrintifyCatalogProduct[] = [];

  for (const product of rawProducts) {
    const id = typeof product.id === 'string' ? product.id : '';
    if (!id) continue;
    if (product.visible === false) continue;

    const title = typeof product.title === 'string' && product.title.trim()
      ? product.title.trim()
      : 'Untitled Product';

    const description = stripHtml(
      typeof product.description === 'string' ? product.description : ''
    );

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const activeVariants = variants.filter((variant) => (
      variant.is_enabled !== false && variant.is_available !== false
    ));

    const priceCandidates = activeVariants
      .map((variant) => toNumber(variant.price))
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

    const priceFromCents = priceCandidates.length > 0
      ? Math.min(...priceCandidates)
      : null;

    const currency = normalizeCurrency(activeVariants[0]?.currency);
    const priceLabel = formatPriceFromCents(priceFromCents, currency);

    const images = Array.isArray(product.images) ? product.images : [];
    const defaultImage = images.find((image) => image?.is_default && typeof image.src === 'string')
      ?? images.find((image) => typeof image?.src === 'string');

    const tags = Array.isArray(product.tags)
      ? product.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : [];

    const productUrl = buildProductUrl(storefrontUrl, product.external?.handle);

    mapped.push({
      id,
      title,
      description,
      tags,
      imageUrl: defaultImage?.src ?? null,
      variantCount: activeVariants.length,
      priceFromCents,
      currency,
      priceLabel,
      productUrl,
    });
  }

  return mapped;
}

export async function getPrintifyCatalog(options?: { forceRefresh?: boolean }): Promise<PrintifyCatalog> {
  const now = Date.now();
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && printifyCatalogCache && printifyCatalogCache.expiresAt > now) {
    return {
      ...printifyCatalogCache.value,
      cached: true,
    };
  }

  const token = getPrintifyToken();
  const storefrontUrl = normalizeStorefrontUrl(process.env.PRINTIFY_STOREFRONT_URL);
  const shop = await resolveShop(token);
  const productsResponse = await fetchPrintifyJson<PrintifyProductsResponse>(
    `/shops/${encodeURIComponent(shop.id)}/products.json?limit=100`,
    token
  );

  const rawProducts = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  const products = mapPrintifyProducts(rawProducts, storefrontUrl);
  const nextValue: Omit<PrintifyCatalog, 'cached'> = {
    shopId: shop.id,
    shopTitle: shop.title,
    storefrontUrl,
    fetchedAtUnix: Math.floor(now / 1000),
    products,
  };

  printifyCatalogCache = {
    expiresAt: now + PRINTIFY_CACHE_TTL_MS,
    value: nextValue,
  };

  return {
    ...nextValue,
    cached: false,
  };
}
