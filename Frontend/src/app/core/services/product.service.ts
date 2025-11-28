import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Product, Category } from '../models/product.model';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../../../assets/data/mock-data';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  getProducts(filters?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Observable<Product[]> {
    let products = [...MOCK_PRODUCTS];

    if (filters) {
      if (filters.category) {
        products = products.filter((p) => p.categoryId === filters.category);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search)
        );
      }
      if (filters.minPrice !== undefined) {
        products = products.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        products = products.filter((p) => p.price <= filters.maxPrice!);
      }
    }

    return of(products).pipe(delay(300));
  }

  getProductById(id: string): Observable<Product | undefined> {
    const product = MOCK_PRODUCTS.find(p => p.id === id);
    return of(product).pipe(delay(200));
  }

  getCategories(): Observable<Category[]> {
    return this.httpClient.get<BackendCategoryDto[]>(this.categoriesUrl).pipe(
      map((categories) =>
        categories.map((c) => ({
          id: String(c.id),
          name: c.name,
          icon: '🥕',
          image: c.imageUrl || ''
        }))
      ),
      catchError((error) => {
        console.warn('Backend categories unavailable, using mock:', error);
        return of(MOCK_CATEGORIES);
      })
    );
  }

  getBestSellers(limit?: number): Observable<Product[]> {
    return this.getProducts().pipe(
      catchError(() => {
        const sorted = [...MOCK_PRODUCTS].sort((a, b) => {
          const scoreA = a.rating * a.reviews;
          const scoreB = b.rating * b.reviews;
          return scoreB - scoreA;
        });
        return of(limit ? sorted.slice(0, limit) : sorted);
      })
    );
  }

  getNewArrivals(limit?: number): Observable<Product[]> {
    const newProducts = [...MOCK_PRODUCTS].reverse();
    return of(limit ? newProducts.slice(0, limit) : newProducts);
  }
}
