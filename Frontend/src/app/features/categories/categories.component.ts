import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Category } from '../../core/models/product.model';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';

@Component({
    selector: 'app-categories',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    template: `
    <div class="min-h-screen bg-background py-12">
      <div class="container mx-auto px-4">
        <div class="mb-8">
          <h1 class="text-4xl font-bold mb-2">Shop by Category</h1>
          <p class="text-muted-foreground">Browse our wide selection of fresh products</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          @for (category of categories; track category.id) {
            <a
              [routerLink]="['/products']"
              [queryParams]="{ category: category.id }"
              class="group relative overflow-hidden rounded-lg border bg-white hover:shadow-lg transition-shadow"
            >
              <div class="aspect-square overflow-hidden">
                <img
                  [src]="category.image"
                  [alt]="category.name"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div class="p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">{{ category.icon }}</span>
                    <h3 class="font-semibold">{{ category.name }}</h3>
                  </div>
                  <lucide-icon
                    [img]="ArrowRight"
                    class="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform"
                  ></lucide-icon>
                </div>
              </div>
            </a>
          }
        </div>
      </div>
    </div>
  `
})
export class CategoriesComponent implements OnInit {
    productService = inject(ProductService);
    readonly ArrowRight = ArrowRight;

    categories: Category[] = [];

    ngOnInit(): void {
        this.productService.getCategories().subscribe(categories => {
            this.categories = categories;
        });
    }
}
