import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { LucideAngularModule, Heart, ShoppingCart, Trash2 } from 'lucide-angular';

@Component({
    selector: 'app-wishlist',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './wishlist.component.html',
    styleUrls: ['./wishlist.component.scss']
})
export class WishlistComponent {
    wishlistService = inject(WishlistService);
    cartService = inject(CartService);

    // Icons
    readonly Heart = Heart;
    readonly ShoppingCart = ShoppingCart;
    readonly Trash2 = Trash2;

    addToCart(productId: string): void {
        const product = this.wishlistService.items().find(p => p.id === productId);
        if (product) {
            this.cartService.addToCart(product);
            this.wishlistService.removeFromWishlist(productId);
        }
    }

    removeFromWishlist(productId: string): void {
        this.wishlistService.removeFromWishlist(productId);
    }
}
