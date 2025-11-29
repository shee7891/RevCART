import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, catchError, map } from 'rxjs';
import { Product, Category } from '../models/product.model';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../../../assets/data/mock-data';
import { environment } from '../../../environments/environment';

interface BackendCategoryDto {
  id: number;
  name: string;
  imageUrl?: string;
}

interface BackendProductDto {
  id: number;
  name: string;
  description: string;
  price: number;
  discount?: number;
  imageUrl: string;
  active: boolean;
  sku?: string;
  brand?: string;
  categoryName: string;
  categoryId: number;
  availableQuantity?: number;
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private categoriesUrl = `${environment.apiUrl}/categories`;
  private productsUrl = `${environment.apiUrl}/products`;

  constructor(private httpClient: HttpClient) { }

  getProducts(filters?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Observable<Product[]> {
    let params = new HttpParams().set('page', '0').set('size', '100');

    if (filters?.search) {
      params = params.set('keyword', filters.search);
    }

    return this.httpClient.get<PagedResponse<BackendProductDto>>(this.productsUrl, { params }).pipe(
      map(response => {
        let products = response.content.map(this.mapBackendProductToFrontend);

        // Apply client-side filters that aren't supported by backend
        if (filters) {
          if (filters.category) {
            products = products.filter((p) => p.categoryId === filters.category);
          }
          if (filters.minPrice !== undefined) {
            products = products.filter((p) => p.price >= filters.minPrice!);
          }
          if (filters.maxPrice !== undefined) {
            products = products.filter((p) => p.price <= filters.maxPrice!);
          }
        }

        return products;
      }),
      catchError((error) => {
        console.warn('Backend products unavailable, using mock:', error);
        // Fallback to mock data if backend fails
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
      })
    );
  }

  private mapBackendProductToFrontend = (backendProduct: BackendProductDto): Product => {
    const originalPrice = backendProduct.discount
      ? Number(backendProduct.price) + Number(backendProduct.discount)
      : undefined;

    return {
      id: String(backendProduct.id),
      name: backendProduct.name,
      price: Number(backendProduct.price),
      category: backendProduct.categoryName,
      categoryId: String(backendProduct.categoryId),
      image: backendProduct.imageUrl,
      unit: 'unit', // Default unit, adjust if backend provides this
      description: backendProduct.description || '',
      inStock: (backendProduct.availableQuantity || 0) > 0,
      rating: 0, // Backend doesn't provide rating, set default
      reviews: 0, // Backend doesn't provide reviews, set default
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      discount: backendProduct.discount ? Number(backendProduct.discount) : undefined
    };
  };

  getProductById(id: string): Observable<Product | undefined> {
    return this.httpClient.get<BackendProductDto>(`${this.productsUrl}/${id}`).pipe(
      map(backendProduct => this.mapBackendProductToFrontend(backendProduct)),
      catchError((error) => {
        console.warn('Backend product unavailable, using mock:', error);
        // Fallback to mock data if backend fails
        const product = MOCK_PRODUCTS.find(p => p.id === id);
        return of(product).pipe(delay(200));
      })
    );
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
