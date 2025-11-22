import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, CreditCard, MapPin } from 'lucide-angular';

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent {
    cartService = inject(CartService);
    authService = inject(AuthService);
    router = inject(Router);

    // Icons
    readonly CreditCard = CreditCard;
    readonly MapPin = MapPin;

    // Form data
    formData = signal({
        fullName: this.authService.user()?.name || '',
        phone: this.authService.user()?.phone || '',
        address: '',
        city: '',
        postalCode: '',
        paymentMethod: 'card'
    });

    get deliveryFee(): number {
        return this.cartService.total() > 0 ? 5.99 : 0;
    }

    get grandTotal(): number {
        return this.cartService.total() + this.deliveryFee;
    }

    onSubmit(): void {
        // Mock order placement
        console.log('Order placed:', this.formData());
        this.cartService.clearCart();
        this.router.navigate(['/orders']);
    }
}
