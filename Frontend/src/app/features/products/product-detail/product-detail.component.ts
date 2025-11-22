import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { Product } from '../../../core/models/product.model';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { LucideAngularModule, Star, ShoppingCart, Heart, Truck, Shield } from 'lucide-angular';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent, LucideAngularModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);

  product = signal<Product | null>(null);
  relatedProducts = signal<Product[]>([]);
  quantity = signal(1);
  loading = signal(true);

  // Icons
  readonly Star = Star;
  readonly ShoppingCart = ShoppingCart;
  readonly Heart = Heart;
  readonly Truck = Truck;
  readonly Shield = Shield;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.loadProduct(id);
    });
  }

  loadProduct(id: string): void {
    this.loading.set(true);
    this.productService.getProductById(id).subscribe(product => {
      if (product) {
        this.product.set(product);
        this.loadRelatedProducts(product.categoryId);
      }
      this.loading.set(false);
    });
  }

  loadRelatedProducts(categoryId: string): void {
    this.productService.getProducts({ category: categoryId }).subscribe(products => {
      const currentProductId = this.product()?.id;
      this.relatedProducts.set(
        products.filter(p => p.id !== currentProductId).slice(0, 4)
      );
    });
  }

  increaseQuantity(): void {
    this.quantity.update(q => q + 1);
  }

  decreaseQuantity(): void {
    this.quantity.update(q => Math.max(1, q - 1));
  }

  addToCart(): void {
    const product = this.product();
    if (product) {
      this.cartService.addToCart(product, this.quantity());
    }
  }

  toggleWishlist(): void {
    const product = this.product();
    if (!product) return;

    if (this.isInWishlist()) {
      this.wishlistService.removeFromWishlist(product.id);
    } else {
      this.wishlistService.addToWishlist(product);
    }
  }

  isInWishlist(): boolean {
    const product = this.product();
    return product ? this.wishlistService.isInWishlist(product.id) : false;
  }
}
