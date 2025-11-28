import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../../core/services/category.service';
import { LucideAngularModule, Plus, Edit, Trash2, X, Save } from 'lucide-angular';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Manage Categories</h1>
          <button
            (click)="openAddModal()"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            <lucide-icon [img]="Plus" class="h-4 w-4"></lucide-icon>
            Add Category
          </button>
        </div>

        <!-- Categories Table -->
        <div class="bg-white rounded-lg border overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @if (isLoading) {
                <tr>
                  <td colspan="5" class="px-6 py-8 text-center text-gray-500">Loading categories...</td>
                </tr>
              } @else if (categories.length === 0) {
                <tr>
                  <td colspan="5" class="px-6 py-8 text-center text-gray-500">No categories found</td>
                </tr>
              } @else {
                @for (category of categories; track category.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">{{ category.id }}</td>
                    <td class="px-6 py-4 font-medium">{{ category.name }}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">{{ category.slug }}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">{{ category.description || '-' }}</td>
                    <td class="px-6 py-4">
                      <div class="flex gap-2">
                        <button
                          (click)="openEditModal(category)"
                          class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <lucide-icon [img]="Edit" class="h-4 w-4"></lucide-icon>
                        </button>
                        <button
                          (click)="deleteCategory(category.id)"
                          class="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <lucide-icon [img]="Trash2" class="h-4 w-4"></lucide-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    @if (showModal) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg max-w-lg w-full">
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">{{ editingCategory ? 'Edit Category' : 'Add Category' }}</h2>
              <button (click)="closeModal()" class="p-2 hover:bg-gray-100 rounded">
                <lucide-icon [img]="X" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            <form (ngSubmit)="saveCategory()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  name="name"
                  required
                  placeholder="e.g., Fruits & Vegetables"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  (input)="generateSlug()"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Slug *</label>
                <input
                  type="text"
                  [(ngModel)]="formData.slug"
                  name="slug"
                  required
                  placeholder="e.g., fruits-vegetables"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p class="mt-1 text-xs text-gray-500">URL-friendly identifier (auto-generated from name)</p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea
                  [(ngModel)]="formData.description"
                  name="description"
                  rows="3"
                  placeholder="Optional description for this category"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  [(ngModel)]="formData.imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p class="mt-1 text-xs text-gray-500">Optional image URL for this category</p>
              </div>

              @if (errorMessage) {
                <div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {{ errorMessage }}
                </div>
              }

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
export class AdminCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);

  categories: Category[] = [];
  isLoading = false;
  showModal = false;
  editingCategory: Category | null = null;
  isSaving = false;
  errorMessage = '';

  formData = {
    name: '',
    slug: '',
    description: '',
    imageUrl: ''
  };

  // Icons
  readonly Plus = Plus;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly Save = Save;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load categories:', err);
        this.isLoading = false;
        if (err.status === 403) {
          this.errorMessage = 'Access denied. Please ensure you are logged in as an administrator.';
        } else if (err.status === 401) {
          this.errorMessage = 'Authentication required. Please log in again.';
        } else {
          this.errorMessage = 'Failed to load categories. Please try again.';
        }
      }
    });
  }

  openAddModal(): void {
    this.editingCategory = null;
    this.formData = {
      name: '',
      slug: '',
      description: '',
      imageUrl: ''
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(category: Category): void {
    this.editingCategory = category;
    this.formData = {
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: (category as any).imageUrl || ''
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCategory = null;
    this.errorMessage = '';
  }

  generateSlug(): void {
    if (!this.editingCategory) {
      // Auto-generate slug from name if not editing
      this.formData.slug = this.formData.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
  }

  saveCategory(): void {
    if (!this.formData.name || !this.formData.slug) {
      this.errorMessage = 'Name and slug are required';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const categoryData = {
      name: this.formData.name.trim(),
      slug: this.formData.slug.trim(),
      description: this.formData.description?.trim() || undefined,
      imageUrl: this.formData.imageUrl?.trim() || undefined
    };

    const operation = this.editingCategory
      ? this.categoryService.updateCategory(this.editingCategory.id, categoryData)
      : this.categoryService.createCategory(categoryData);

    operation.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadCategories();
      },
      error: (err) => {
        this.isSaving = false;
        if (err.status === 403) {
          this.errorMessage = 'Access denied. Please ensure you are logged in as an administrator.';
        } else if (err.status === 401) {
          this.errorMessage = 'Authentication required. Please log in again.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Invalid category data';
        } else if (err.status === 409) {
          this.errorMessage = 'A category with this name or slug already exists';
        } else {
          this.errorMessage = 'Failed to save category. Please try again.';
        }
        console.error('Failed to save category:', err);
      }
    });
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.loadCategories();
      },
      error: (err) => {
        console.error('Failed to delete category:', err);
        // Extract error message from API response
        let errorMessage = 'Failed to delete category.';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        alert(errorMessage);
      }
    });
  }
}

