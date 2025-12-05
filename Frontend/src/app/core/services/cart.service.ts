import { Injectable, signal, computed, Inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSignal = signal<CartItem[]>([]);
  private apiUrl = `${environment.apiUrl}/cart`;

  // Computed values
  items = this.itemsSignal.asReadonly();
  total = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  itemCount = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private httpClient: HttpClient
  ) {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

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
    if (!isPlatformBrowser(this.platformId)) return;
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
        unit: product.unit,
        availableQuantity: product.availableQuantity
      };

      return [...items, newItem];
    });

    this.saveCartToStorage();

    // Try to sync with server
    this.syncWithServer();
  }

  removeFromCart(productId: string): void {
    this.itemsSignal.update(items =>
      items.filter(item => item.id !== productId)
    );
    this.saveCartToStorage();
    this.syncWithServer();
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
    this.syncWithServer();
  }

  clearCart(): void {
    this.itemsSignal.set([]);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('revcart_cart');
    }
    this.syncWithServer();
  }

  /**
   * Update available quantity for cart items based on fresh stock data from server
   * This is called after refreshing stock to ensure cart shows latest inventory
   */
  updateItemsStock(stockMap: Map<string, number>): void {
    this.itemsSignal.update(items =>
      items.map(item => ({
        ...item,
        availableQuantity: stockMap.get(item.id) ?? item.availableQuantity
      }))
    );
    this.saveCartToStorage();
  }

  private syncWithServer(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('revcart_token');
    if (!token) return; // User not authenticated, skip sync

    // Sync cart with backend (optional - can be implemented later)
    // For now, this is a placeholder
    try {
      // this.httpClient.post(`${this.apiUrl}/sync`, this.itemsSignal()).subscribe();
    } catch (error) {
      console.warn('Cart sync failed:', error);
    }
  }
}
