import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { LucideAngularModule, ShoppingBag, Trash2, Plus, Minus } from 'lucide-angular';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './cart.component.html',
    // styleUrls: ['./cart.component.scss']
})
export class CartComponent {
    cartService = inject(CartService);

    // Icons
    readonly ShoppingBag = ShoppingBag;
    readonly Trash2 = Trash2;
    readonly Plus = Plus;
    readonly Minus = Minus;

    get deliveryFee(): number {
        return this.cartService.total() > 0 ? 5.99 : 0;
    }

    get grandTotal(): number {
        return this.cartService.total() + this.deliveryFee;
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
}
