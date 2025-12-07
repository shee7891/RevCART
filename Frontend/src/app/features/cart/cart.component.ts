import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { StockService, StockValidationResult } from '../../core/services/stock.service';
import { LucideAngularModule, ShoppingBag, Trash2, Plus, Minus, AlertCircle, RefreshCw } from 'lucide-angular';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './cart.component.html',
    // styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
    cartService = inject(CartService);
    stockService = inject(StockService);
    router = inject(Router);

    // Icons
    readonly ShoppingBag = ShoppingBag;
    readonly Trash2 = Trash2;
    readonly Plus = Plus;
    readonly Minus = Minus;
    readonly AlertCircle = AlertCircle;
    readonly RefreshCw = RefreshCw;

    // State signals
    isValidatingStock = signal(false);
    isRefreshingStock = signal(false);
    stockValidationError = signal<string>('');
    insufficientStockItems = signal<Array<{
        productId: string;
        productName: string;
        requestedQuantity: number;
        availableQuantity: number;
    }>>([]);
    liveStockData = signal<Map<string, number>>(new Map());

    get deliveryFee(): number {
        return this.cartService.total() > 0 ? 5.99 : 0;
    }

    get grandTotal(): number {
        return this.cartService.total() + this.deliveryFee;
    }

    ngOnInit(): void {
        // Load fresh stock data when cart page loads
        this.refreshStockData();
    }

    /**
     * Refresh stock data from server for all items in cart
     */
    refreshStockData(): void {
        this.isRefreshingStock.set(true);
        const items = this.cartService.items();

        if (items.length === 0) {
            this.isRefreshingStock.set(false);
            return;
        }

        const stockRequests = items.map(item =>
            this.stockService.getAvailableQuantity(item.id)
        );

        if (stockRequests.length === 0) {
            this.isRefreshingStock.set(false);
            return;
        }

        Promise.all(stockRequests.map(req => req.toPromise())).then(quantities => {
            const stockMap = new Map<string, number>();
            items.forEach((item, index) => {
                stockMap.set(item.id, quantities[index] || 0);
            });
            this.liveStockData.set(stockMap);
            this.isRefreshingStock.set(false);
            this.cartService.updateItemsStock(stockMap);
        }).catch(error => {
            console.error('Failed to refresh stock:', error);
            this.isRefreshingStock.set(false);
        });
    }

    increaseQuantity(productId: string, currentQuantity: number): void {
        this.cartService.updateQuantity(productId, currentQuantity + 1);
    }

    decreaseQuantity(productId: string, currentQuantity: number): void {
        if (currentQuantity > 1) {
            this.cartService.updateQuantity(productId, currentQuantity - 1);
        }
    }

    removeItem(productId: string): void {
        this.cartService.removeFromCart(productId);
    }

    /**
     * Validate stock before proceeding to checkout
     */
    proceedToCheckout(): void {
        this.isValidatingStock.set(true);
        this.stockValidationError.set('');
        this.insufficientStockItems.set([]);

        this.stockService.validateCartStock(this.cartService.items()).subscribe({
            next: (result: StockValidationResult) => {
                this.isValidatingStock.set(false);

                if (result.isValid) {
                    // Stock is valid, proceed to checkout
                    this.router.navigate(['/checkout']);
                } else {
                    // Stock insufficient, show error
                    this.insufficientStockItems.set(result.insufficientItems);
                    this.stockValidationError.set(
                        `Insufficient stock for ${result.insufficientItems.length} item(s). Please update quantities.`
                    );
                }
            },
            error: (error) => {
                this.isValidatingStock.set(false);
                console.error('Stock validation error:', error);
                this.stockValidationError.set(
                    'Failed to validate stock. Please try again.'
                );
            }
        });
    }

    /**
     * Get available quantity for a cart item
     * Uses live stock data from server if available
     */
    getAvailableQuantity(productId: string): number {
        const liveStock = this.liveStockData().get(productId);
        if (liveStock !== undefined) {
            return liveStock;
        }
        const item = this.cartService.items().find(i => i.id === productId);
        return item?.availableQuantity || 0;
    }

    /**
     * Check if a cart item has insufficient stock
     */
    hasInsufficientStock(productId: string): boolean {
        const item = this.cartService.items().find(i => i.id === productId);
        if (!item) return false;
        return (item.availableQuantity || 0) < item.quantity;
    }

    /**
     * Check if any item in cart has insufficient stock
     * Uses live stock data if available
     */
    hasAnyInsufficientStock(): boolean {
        const liveStockMap = this.liveStockData();
        return this.cartService.items().some(item => {
            const availableQuantity = liveStockMap.get(item.id) ?? item.availableQuantity ?? 0;
            return availableQuantity < item.quantity || availableQuantity === 0;
        });
    }
}

