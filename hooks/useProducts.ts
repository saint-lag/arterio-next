'use client';

import { useState, useEffect } from 'react';
import { productService, mapWCProductsToLocal } from '@/app/services/woocommerce';
import type { Product } from '@/app/types/woocommerce';

interface UseProductsOptions {
  category?: string; // Este é o ID da categoria que vem da URL
  search?: string;
  perPage?: number;
  featured?: boolean;
  enabled?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { category, search, perPage = 100, featured, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);

        // 1. Buscamos os produtos à API (sem enviar a categoria para evitar bugs da Store API)
        let wcProducts = await productService.getAll({
          per_page: perPage,
          search,
          featured,
        });

        if (isMounted) {
          // 2. Filtramos a lista localmente usando o ID numérico exato do WooCommerce
          if (category) {
            wcProducts = wcProducts.filter((wcProduct: any) => 
              wcProduct.categories?.some((cat: any) => cat.id.toString() === category)
            );
          }

          // 3. Mapeamos apenas os produtos filtrados para o ecrã
          const localProducts = mapWCProductsToLocal(wcProducts);
          setProducts(localProducts);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch products'));
          console.error('Error fetching products:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [category, search, perPage, featured, enabled]);

  return { products, loading, error };
}

export function useProduct(productId: number | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const wcProduct = await productService.getById(productId!);

        if (isMounted) {
          const localProduct = mapWCProductsToLocal([wcProduct])[0];
          setProduct(localProduct);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch product'));
          console.error('Error fetching product:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  return { product, loading, error };
}