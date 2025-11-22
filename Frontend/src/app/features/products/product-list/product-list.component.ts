import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product, Category } from '../../../core/models/product.model';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LucideAngularModule, Search, SlidersHorizontal } from 'lucide-angular';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ProductCardComponent, LucideAngularModule],
    template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-4xl font-bold mb-2">Our Products</h1>
          <p class="text-gray-600">Fresh groceries delivered to your door</p>
        </div>

        <!-- Search & Filters -->
        <div class="flex flex-col md:flex-row gap-4 mb-8">
          <!-- Search -->
          <div class="flex-1 relative">
            <lucide-icon [img]="Search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
            <input
              type="search"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search products..."
              class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Sort -->
          <select
            [(ngModel)]="sortBy"
            (ngModelChange)="onFilterChange()"
            class="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="name">Name (A-Z)</option>
            <option value="price_low">Price (Low to High)</option>
            <option value="price_high">Price (High to Low)</option>
            <option value="rating">Rating</option>
          </select>

          <!-- Filter Button (Mobile) -->
          <button
            (click)="showFilters = !showFilters"
            class="md:hidden flex items-center gap-2 px-4 py-2 border rounded-md"
          >
            <lucide-icon [img]="SlidersHorizontal" class="h-4 w-4"></lucide-icon>
            Filters
          </button>
        </div>

        <div class="flex gap-6">
          <!-- Sidebar Filters (Desktop) -->
          <aside class="hidden md:block w-64 space-y-6">
            <!-- Categories -->
            <div class="bg-white p-4 rounded-lg border">
              <h3 class="font-semibold mb-3">Categories</h3>
              <div class="space-y-2">
                @for (category of categories; track category.id) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="selectedCategories().includes(category.id)"
                      (change)="toggleCategory(category.id)"
                      class="rounded text-primary focus:ring-primary"
                    />
                    <span class="text-sm">{{ category.name }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Price Range -->
            <div class="bg-white p-4 rounded-lg border">
              <h3 class="font-semibold mb-3">Price Range</h3>
              <div class="space-y-3">
                <div>
                  <label class="text-sm text-gray-600">Min Price</label>
                  <input
                    type="number"
                    [(ngModel)]="minPrice"
                    (ngModelChange)="onFilterChange()"
                    min="0"
                    class="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="text-sm text-gray-600">Max Price</label>
                  <input
                    type="number"
                    [(ngModel)]="maxPrice"
                    (ngModelChange)="onFilterChange()"
                    min="0"
                    class="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </aside>

          <!-- Products Grid -->
          <div class="flex-1">
            @if (isLoading) {
              <div class="flex justify-center items-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            } @else if (filteredProducts().length === 0) {
              <div class="text-center py-12">
                <p class="text-gray-500 text-lg">No products found</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                @for (product of filteredProducts(); track product.id) {
                  <app-product-card [product]="product" />
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProductListComponent implements OnInit {
    productService = inject(ProductService);
    route = inject(ActivatedRoute);

    // Icons
    readonly Search = Search;
    readonly SlidersHorizontal = SlidersHorizontal;

    // State
    allProducts: Product[] = [];
    categories: Category[] = [];
    isLoading = true;
    showFilters = false;

    // Filters
    searchQuery = '';
    sortBy = 'name';
    selectedCategories = signal<string[]>([]);
    minPrice = 0;
    maxPrice = 1000;

    // Computed filtered products
    filteredProducts = computed(() => {
        let products = [...this.allProducts];

        // Filter by search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query)
            );
        }

        // Filter by categories
        if (this.selectedCategories().length > 0) {
            products = products.filter(p =>
                this.selectedCategories().includes(p.categoryId)
            );
        }

        // Filter by price range
        products = products.filter(p =>
            p.price >= this.minPrice && p.price <= this.maxPrice
        );

        // Sort
        switch (this.sortBy) {
            case 'name':
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price_low':
                products.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                products.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                products.sort((a, b) => b.rating - a.rating);
                break;
        }

        return products;
    });

    ngOnInit(): void {
        this.loadProducts();
        this.loadCategories();
        this.handleQueryParams();
    }

    loadProducts(): void {
        this.productService.getProducts().subscribe(products => {
            this.allProducts = products;
            this.isLoading = false;
        });
    }

    loadCategories(): void {
        this.productService.getCategories().subscribe(categories => {
            this.categories = categories;
        });
    }

    handleQueryParams(): void {
        this.route.queryParams.subscribe(params => {
            if (params['search']) {
                this.searchQuery = params['search'];
            }
            if (params['category']) {
                this.selectedCategories.set([params['category']]);
            }
        });
    }

    toggleCategory(categoryId: string): void {
        this.selectedCategories.update(cats => {
            if (cats.includes(categoryId)) {
                return cats.filter(c => c !== categoryId);
            }
            return [...cats, categoryId];
        });
    }

    onFilterChange(): void {
        // Trigger recomputation
    }
}
