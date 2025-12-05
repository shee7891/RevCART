import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../../core/services/product.service';
import { Product, Category } from '../../../core/models/product.model';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule, Plus, Edit, Trash2, X, Save } from 'lucide-angular';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Manage Products</h1>
          <button
            (click)="openAddModal()"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            <lucide-icon [img]="Plus" class="h-4 w-4"></lucide-icon>
            Add Product
          </button>
        </div>

        <!-- Products Table -->
        <div class="bg-white rounded-lg border overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (product of products; track product.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <img [src]="product.image" [alt]="product.name" class="w-16 h-16 object-cover rounded">
                  </td>
                  <td class="px-6 py-4 font-medium">{{ product.name }}</td>
                  <td class="px-6 py-4">{{ product.category }}</td>
                  <td class="px-6 py-4">₹{{ product.price.toFixed(2) }}</td>
                  <td class="px-6 py-4">{{ getStock(product.id) }}</td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs"
                      [ngClass]="getProductStatusClass(product)"
                    >
                      {{ getProductStatus(product) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex gap-2">
                      <button
                        (click)="openEditModal(product)"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <lucide-icon [img]="Edit" class="h-4 w-4"></lucide-icon>
                      </button>
                      <button
                        (click)="deleteProduct(product.id)"
                        class="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <lucide-icon [img]="Trash2" class="h-4 w-4"></lucide-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
          <div class="mt-4 flex justify-center gap-2">
            <button
              (click)="loadPage(currentPage - 1)"
              [disabled]="currentPage === 0"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span class="px-4 py-2">{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button
              (click)="loadPage(currentPage + 1)"
              [disabled]="currentPage >= totalPages - 1"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Add/Edit Modal -->
    @if (showModal) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">{{ editingProduct ? 'Edit Product' : 'Add Product' }}</h2>
              <button (click)="closeModal()" class="p-2 hover:bg-gray-100 rounded">
                <lucide-icon [img]="X" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            <form (ngSubmit)="saveProduct()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  class="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea
                  [(ngModel)]="formData.description"
                  name="description"
                  rows="3"
                  class="w-full px-3 py-2 border rounded-md"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Price *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.price"
                    name="price"
                    required
                    step="0.01"
                    min="0"
                    class="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Discount (%)</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.discount"
                    name="discount"
                    step="0.01"
                    min="0"
                    max="100"
                    class="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Category *</label>
                <select
                  [(ngModel)]="formData.categoryId"
                  name="categoryId"
                  required
                  class="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select Category</option>
                  @for (cat of categories; track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  [(ngModel)]="formData.imageUrl"
                  name="imageUrl"
                  class="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.quantity"
                    name="quantity"
                    required
                    min="0"
                    class="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div class="flex items-center pt-6">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      [(ngModel)]="formData.active"
                      name="active"
                      class="rounded"
                    />
                    <span class="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div class="flex gap-2 justify-end">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isSaving"
                  class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  <lucide-icon [img]="Save" class="h-4 w-4"></lucide-icon>
                  {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminProductsComponent implements OnInit {
  http = inject(HttpClient);
  productService = inject(ProductService);

  products: Product[] = [];
  categories: Category[] = [];
  showModal = false;
  editingProduct: Product | null = null;
  isSaving = false;
  currentPage = 0;
  totalPages = 1;
  stockMap: Map<string, number> = new Map();

  formData = {
    name: '',
    description: '',
    price: 0,
    discount: 0,
    categoryId: '',
    imageUrl: '',
    quantity: 0,
    active: true
  };

  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly Save = Save;

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.http.get<PagedResponse<any>>(`${environment.apiUrl}/products?page=${this.currentPage}&size=20`)
      .subscribe({
        next: (response) => {
          this.products = response.content.map((p: any) => {
            // Get stock from availableQuantity field in the response (ProductDto returns this)
            const quantity = p.availableQuantity || 0;
            const isActive = p.active !== false;
            // Stock status should be dynamic based on quantity and active status
            const inStock = isActive && quantity > 0;

            return {
              id: p.id.toString(),
              name: p.name,
              price: p.price,
              category: p.categoryName || 'Uncategorized',
              categoryId: p.categoryId ? p.categoryId.toString() : '',
              image: p.imageUrl || '',
              description: p.description || '',
              unit: p.unit || 'each',
              inStock: inStock,
              rating: 0,
              reviews: 0,
              quantity: quantity
            };
          });
          this.totalPages = response.totalPages;
          // Pre-populate stock map from product data
          this.products.forEach(p => {
            this.stockMap.set(p.id, (p as any).quantity || 0);
          });
        },
        error: () => {
          this.productService.getProducts().subscribe(products => {
            this.products = products;
          });
        }
      });
  }

  loadCategories(): void {
    this.http.get<Category[]>(`${environment.apiUrl}/categories`).subscribe({
      next: (cats) => this.categories = cats,
      error: () => {
        this.productService.getCategories().subscribe(cats => this.categories = cats);
      }
    });
  }

  loadStock(): void {
    // Stock is now loaded directly from the product list via availableQuantity field
    // This method is kept for backward compatibility but no longer needed
  }

  getStock(id: string): number {
    return this.stockMap.get(id) || 0;
  }

  getProductStatus(product: Product): string {
    const stock = this.getStock(product.id);
    const isActive = product.inStock;

    if (!isActive) {
      return 'Inactive';
    } else if (stock <= 0) {
      return 'Out of Stock';
    } else if (stock < 10) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  }

  getProductStatusClass(product: Product): string {
    const stock = this.getStock(product.id);
    const isActive = product.inStock;

    if (!isActive) {
      return 'bg-red-100 text-red-800';
    } else if (stock <= 0) {
      return 'bg-orange-100 text-orange-800';
    } else if (stock < 10) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  }

  openAddModal(): void {
    this.editingProduct = null;
    this.formData = {
      name: '',
      description: '',
      price: 0,
      discount: 0,
      categoryId: '',
      imageUrl: '',
      quantity: 0,
      active: true
    };
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.editingProduct = product;
    this.formData = {
      name: product.name,
      description: product.description || '',
      price: product.price,
      discount: (product as any).discount || 0,
      categoryId: product.categoryId || '',
      imageUrl: product.image || '',
      quantity: this.getStock(product.id),
      active: product.inStock
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingProduct = null;
  }

  saveProduct(): void {
    this.isSaving = true;
    const payload = {
      name: this.formData.name,
      description: this.formData.description,
      price: this.formData.price,
      discount: this.formData.discount,
      categoryId: Number(this.formData.categoryId),
      imageUrl: this.formData.imageUrl,
      quantity: this.formData.quantity,
      active: this.formData.active
    };

    const url = this.editingProduct
      ? `${environment.apiUrl}/admin/products/${this.editingProduct.id}`
      : `${environment.apiUrl}/admin/products`;

    const request = this.editingProduct
      ? this.http.put<ApiResponse<any>>(url, payload)
      : this.http.post<ApiResponse<any>>(url, payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadProducts();
      },
      error: (err) => {
        this.isSaving = false;
        alert('Failed to save product: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  deleteProduct(id: string): void {
    if (!confirm('Are you sure you want to delete this product?')) return;
    this.http.delete<ApiResponse<string>>(`${environment.apiUrl}/admin/products/${id}`).subscribe({
      next: () => this.loadProducts(),
      error: () => alert('Failed to delete product')
    });
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadProducts();
  }
}

