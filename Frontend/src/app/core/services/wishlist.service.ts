import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private itemsSignal = signal<Product[]>([]);

  items = this.itemsSignal.asReadonly();
  itemCount = computed(() => this.itemsSignal().length);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('revcart_wishlist');
    if (stored) {
      try {
        this.itemsSignal.set(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading wishlist:', error);
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem('revcart_wishlist', JSON.stringify(this.itemsSignal()));
  }

  addToWishlist(product: Product): void {
    if (!this.isInWishlist(product.id)) {
      this.itemsSignal.update(items => [...items, product]);
      this.saveToStorage();
    }
  }

  removeFromWishlist(productId: string): void {
    this.itemsSignal.update(items =>
      items.filter(item => item.id !== productId)
    );
    this.saveToStorage();
  }

  isInWishlist(productId: string): boolean {
    return this.itemsSignal().some(item => item.id === productId);
  }

  clearWishlist(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem('revcart_wishlist');
  }
}
