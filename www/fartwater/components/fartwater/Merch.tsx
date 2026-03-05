'use client';

import { useEffect, useMemo, useState } from 'react';

type PrintifyCatalogProduct = {
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

type PrintifyCatalogResponse = {
  shopId: string;
  shopTitle: string;
  storefrontUrl: string | null;
  fetchedAtUnix: number;
  cached: boolean;
  products: PrintifyCatalogProduct[];
  error?: string;
};

export function Merch() {
  const [catalog, setCatalog] = useState<PrintifyCatalogResponse | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadCatalog = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch('/api/printify/products', { cache: 'no-store' });
        const data = (await response.json().catch(() => null)) as PrintifyCatalogResponse | null;

        if (!response.ok) {
          const message = data?.error || 'Could not load shop products.';
          throw new Error(message);
        }

        if (!ignore) {
          setCatalog(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not load shop products.';
        if (!ignore) {
          setCatalog(null);
          setLoadError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!catalog || catalog.products.length === 0) {
      setSelectedProductId(null);
      return;
    }

    setSelectedProductId((current) => {
      if (current && catalog.products.some((product) => product.id === current)) {
        return current;
      }
      return catalog.products[0].id;
    });
  }, [catalog]);

  const selectedProduct = useMemo(() => {
    if (!catalog || catalog.products.length === 0) return null;
    if (!selectedProductId) return catalog.products[0];
    return catalog.products.find((product) => product.id === selectedProductId) ?? catalog.products[0];
  }, [catalog, selectedProductId]);

  return (
    <section
      id="merch"
      className="py-20 bg-[radial-gradient(1000px_500px_at_0%_0%,rgba(250,204,21,.18),transparent_55%),radial-gradient(1000px_500px_at_100%_100%,rgba(168,85,247,.18),transparent_55%)]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold diamond-text">Official Merchandise</h2>
        <p className="mt-2 text-zinc-300">
          Live catalog pulled from Printify.
        </p>

        {loading && (
          <div className="mt-6 card chrome-border p-6 text-zinc-300">
            Loading storefront products...
          </div>
        )}

        {!loading && loadError && (
          <div className="mt-6 card chrome-border p-6">
            <h3 className="text-lg font-semibold text-yellow-300">Shop Setup Required</h3>
            <p className="mt-2 text-sm text-zinc-300">{loadError}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Add `PRINTIFY_API_TOKEN` in `.env.local` and optionally `PRINTIFY_SHOP_ID` plus `PRINTIFY_STOREFRONT_URL`.
            </p>
          </div>
        )}

        {!loading && !loadError && catalog && catalog.products.length === 0 && (
          <div className="mt-6 card chrome-border p-6">
            <h3 className="text-lg font-semibold text-yellow-300">No Visible Products Yet</h3>
            <p className="mt-2 text-sm text-zinc-300">
              Your Printify shop is connected but has no visible products right now.
            </p>
          </div>
        )}

        {!loading && !loadError && catalog && catalog.products.length > 0 && (
          <>
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              {catalog.products.map((product) => (
                <article
                  key={product.id}
                  className={`bg-black/40 border rounded-xl p-6 chrome-border ${
                    product.id === selectedProduct?.id ? 'border-yellow-300/60' : 'border-yellow-400/20'
                  }`}
                >
                  <div className="h-40 bg-white/10 rounded mb-4 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-zinc-500 text-sm">
                        No image
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-yellow-300">{product.title}</h3>
                  <p className="text-sm text-zinc-300 mt-1 line-clamp-3">
                    {product.description || 'No description'}
                  </p>
                  <p className="text-sm text-zinc-100 mt-2 font-semibold">{product.priceLabel}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
                  >
                    View
                  </button>
                </article>
              ))}
            </div>

            {selectedProduct && (
              <div className="mt-8 card chrome-border p-6">
                <h3 className="text-xl font-semibold text-[var(--gold)]">{selectedProduct.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">
                  {selectedProduct.description || 'No description'}
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Variants: {selectedProduct.variantCount} | Starting at {selectedProduct.priceLabel}
                </p>
                {selectedProduct.tags.length > 0 && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Tags: {selectedProduct.tags.join(', ')}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {selectedProduct.productUrl ? (
                    <a
                      href={selectedProduct.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2 rounded-lg text-sm font-bold text-black bg-[linear-gradient(90deg,var(--gold),#fff)]"
                    >
                      Buy on Printify
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Add `PRINTIFY_STOREFRONT_URL` to enable direct product links.
                    </span>
                  )}
                  {catalog.storefrontUrl && (
                    <a
                      href={catalog.storefrontUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2 rounded-lg text-sm font-bold border border-yellow-400/30 text-yellow-300"
                    >
                      Open Full Shop
                    </a>
                  )}
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {catalog.cached ? 'Cached' : 'Live'} feed from {catalog.shopTitle} (shop ID {catalog.shopId})
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
