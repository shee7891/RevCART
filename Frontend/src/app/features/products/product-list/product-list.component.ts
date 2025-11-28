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
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search products..."
              class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Sort -->
          <select
            [ngModel]="sortBy()"
            (ngModelChange)="sortBy.set($event)"
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
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold">Categories</h3>
                @if (selectedCategories().length > 0) {
                  <button
                    (click)="clearCategoryFilters()"
                    class="text-xs text-primary hover:underline"
                  >
                    Clear
                  </button>
                }
              </div>
              <div class="space-y-2">
                @for (category of categories; track category.id) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="isCategorySelected(category.id)"
                      (click)="toggleCategory(category.id)"
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
                    [value]="minPrice() ?? ''"
                    (input)="onMinPriceChange($event)"
                    min="0"
                    placeholder="0"
                    class="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label class="text-sm text-gray-600">Max Price</label>
                  <input
                    type="number"
                    [value]="maxPrice() ?? ''"
                    (input)="onMaxPriceChange($event)"
                    min="0"
                    placeholder="No limit"
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
                @if (selectedCategories().length > 0) {
                  <p class="text-sm text-gray-400 mt-2">
                    Try clearing category filters or check if products have categories assigned
                  </p>
                }
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

    // Filters (using signals for reactivity)
    searchQuery = signal('');
    sortBy = signal('name');
    selectedCategories = signal<string[]>([]);
    minPrice = signal<number | null>(null);
    maxPrice = signal<number | null>(null);

    // Computed filtered products
    filteredProducts = computed(() => {
        let products = [...this.allProducts];

        // Filter by search
        const searchQuery = this.searchQuery();
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        // Filter by categories
        const selectedCats = this.selectedCategories();
        if (selectedCats.length > 0) {
            // Get all available category IDs from loaded categories for validation
            const availableCategoryIds = this.categories.map(c => c.id);

            products = products.filter(p => {
                const categoryId = p.categoryId;
                // Check if product has a valid categoryId
                if (!categoryId || categoryId === '') {
                    return false;
                }
                // Ensure categoryId is a string for comparison
                const categoryIdStr = String(categoryId);
                // Check if categoryId matches any selected category
                return selectedCats.includes(categoryIdStr);
            });
        }

        // Filter by price range
        const minPrice = this.minPrice();
        const maxPrice = this.maxPrice();
        if (minPrice !== null && minPrice !== undefined) {
            products = products.filter(p => p.price >= minPrice);
        }
        if (maxPrice !== null && maxPrice !== undefined) {
            products = products.filter(p => p.price <= maxPrice);
        }

        // Sort
        const sortBy = this.sortBy();
        switch (sortBy) {
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
                products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
            // Initialize max price if not set
            if (this.maxPrice() === null && products.length > 0) {
                const maxProductPrice = Math.max(...products.map(p => p.price));
                this.maxPrice.set(Math.ceil(maxProductPrice));
            }
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
                this.searchQuery.set(params['search']);
            }
            if (params['category']) {
                this.selectedCategories.set([params['category']]);
            }
        });
    }

    isCategorySelected(categoryId: string): boolean {
        return this.selectedCategories().includes(categoryId);
    }

    toggleCategory(categoryId: string): void {
        const current = this.selectedCategories();
        // Ensure categoryId is a string
        const categoryIdStr = String(categoryId);
        const newCats = current.includes(categoryIdStr)
            ? current.filter(c => c !== categoryIdStr)
            : [...current, categoryIdStr];
        this.selectedCategories.set(newCats);
    }

    clearCategoryFilters(): void {
        this.selectedCategories.set([]);
    }

    onMinPriceChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.minPrice.set(value === '' ? null : Number(value));
    }

    onMaxPriceChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.maxPrice.set(value === '' ? null : Number(value));
    }
}
