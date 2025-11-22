import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSignal = signal<CartItem[]>([]);

  // Computed values
  items = this.itemsSignal.asReadonly();
  total = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  itemCount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return; // ⛔ Prevent Vite SSR crash

    const storedCart = localStorage.getItem('revcart_cart');
    if (storedCart) {
      try {
        const items = JSON.parse(storedCart);
        this.itemsSignal.set(items);
      } catch (error) {
        console.error('Error loading cart:', error);
        localStorage.removeItem('revcart_cart');
      }
    }
  }

  private saveCartToStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return; // safe check
    localStorage.setItem('revcart_cart', JSON.stringify(this.itemsSignal()));
  }

  addToCart(product: Product, quantity: number = 1): void {
    this.itemsSignal.update(items => {
      const existingIndex = items.findIndex(item => item.id === product.id);

      if (existingIndex >= 0) {
        const updatedItems = [...items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity
        };
        return updatedItems;
      }

      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        unit: product.unit
      };

      return [...items, newItem];
    });

    this.saveCartToStorage();
  }

  removeFromCart(productId: string): void {
    this.itemsSignal.update(items =>
      items.filter(item => item.id !== productId)
    );
    this.saveCartToStorage();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    this.itemsSignal.update(items =>
      items.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
    this.saveCartToStorage();
  }

  clearCart(): void {
    this.itemsSignal.set([]);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('revcart_cart');
    }
  }
}
