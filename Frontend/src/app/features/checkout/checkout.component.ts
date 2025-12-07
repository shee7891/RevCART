import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { environment } from '../../../environments/environment';
import { LucideAngularModule, CreditCard, MapPin } from 'lucide-angular';

interface AddressDto {
    id?: number;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    primaryAddress: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

interface CheckoutRequest {
    addressId: number;
    paymentMethod?: string;
}

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './checkout.component.html',
    styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
    cartService = inject(CartService);
    authService = inject(AuthService);
    router = inject(Router);
    http = inject(HttpClient);
    orderService = inject(OrderService);

    // Icons
    readonly CreditCard = CreditCard;
    readonly MapPin = MapPin;

    // Form data
    formData = signal({
        fullName: this.authService.user()?.name || '',
        phone: this.authService.user()?.phone || '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        paymentMethod: 'card'
    });

    isLoading = signal(false);
    errorMessage = signal('');

    // Saved addresses
    addresses = signal<AddressDto[]>([]);
    selectedAddressId: number | 'new' = 'new';

    ngOnInit(): void {
        this.fetchSavedAddresses();
    }

    // Fetch addresses
    fetchSavedAddresses(): void {
        this.http.get<ApiResponse<AddressDto[]>>(`${environment.apiUrl}/profile/addresses`).subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.addresses.set(res.data);
                    const primary = res.data.find((a) => a.primaryAddress && a.id);
                    const fallback = res.data.find((a) => !!a.id);
                    if (primary?.id) {
                        this.setSelectedAddress(primary.id);
                    } else if (fallback?.id) {
                        this.setSelectedAddress(fallback.id);
                    } else {
                        this.setSelectedAddress('new');
                    }
                } else {
                    this.setSelectedAddress('new');
                }
            },
            error: (err) => {
                console.error('Failed to fetch addresses', err);
                this.setSelectedAddress('new');
            }
        });
    }

    onAddressSelectionChange(addressId: number | 'new'): void {
        this.setSelectedAddress(addressId);
    }

    private setSelectedAddress(addressId: number | 'new'): void {
        this.selectedAddressId = addressId;
        const user = this.authService.user();
        const baseForm = {
            ...this.formData(),
            fullName: user?.name || '',
            phone: user?.phone || ''
        };

        if (addressId === 'new') {
            this.formData.set({
                ...baseForm,
                address: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'India'
            });
            return;
        }

        const address = this.addresses().find((a) => a.id === addressId);
        if (address) {
            this.formData.set({
                ...baseForm,
                address: address.line1,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country
            });
        }
    }

    get deliveryFee(): number {
        return this.cartService.total() > 0 ? 5.99 : 0;
    }

    get grandTotal(): number {
        return this.cartService.total() + this.deliveryFee;
    }

    onSubmit(): void {
        if (this.cartService.items().length === 0) {
            this.errorMessage.set('Your cart is empty');
            return;
        }

        const data = this.formData();
        if (!data.address || !data.city || !data.postalCode || !data.state) {
            this.errorMessage.set('Please fill in all required address fields');
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set('');

        // Step 1: Sync cart to backend
        this.syncCartToBackend().then(() => {
            // Step 2: Create address
            const addressData: AddressDto = {
                line1: data.address,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country || 'India',
                primaryAddress: true
            };

            this.http.post<ApiResponse<AddressDto>>(`${environment.apiUrl}/profile/address`, addressData)
                .subscribe({
                    next: (response) => {
                        if (response.success && response.data?.id) {
                            // Step 3: Create order with addressId
                            this.placeOrder(response.data.id);
                        } else {
                            this.isLoading.set(false);
                            this.errorMessage.set('Failed to save address. Please try again.');
                        }
                    },
                    error: (err) => {
                        this.isLoading.set(false);
                        if (err.status === 400) {
                            this.errorMessage.set(err.error?.message || 'Invalid address data');
                        } else {
                            this.errorMessage.set('Failed to save address. Please try again.');
                        }
                        console.error('Address creation failed:', err);
                    }
                });
        }).catch((err) => {
            this.isLoading.set(false);
            this.errorMessage.set('Failed to sync cart. Please try again.');
            console.error('Cart sync failed:', err);
        });
    }

    private syncCartToBackend(): Promise<void> {
        return new Promise((resolve, reject) => {
            const items = this.cartService.items();
            if (items.length === 0) {
                console.warn('Cart is empty, nothing to sync');
                resolve();
                return;
            }

            console.log('Syncing cart to backend. Items:', items);

            // Filter out invalid items first
            const validItems = items.filter(item => {
                const productId = parseInt(item.id, 10);
                if (isNaN(productId) || productId <= 0) {
                    console.warn('Skipping invalid product ID:', item.id);
                    return false;
                }
                return true;
            });

            if (validItems.length === 0) {
                this.errorMessage.set('No valid products found in cart. Please add products from the catalog.');
                reject(new Error('No valid products'));
                return;
            }

            // Clear existing cart on server first, then add all items
            this.http.delete(`${environment.apiUrl}/cart/clear`).subscribe({
                next: () => {
                    console.log('Cart cleared, adding items...');
                    // Add all items sequentially to avoid race conditions
                    this.addItemsSequentially(validItems, 0, resolve, reject);
                },
                error: (err) => {
                    console.warn('Failed to clear cart, trying to add items anyway:', err);
                    // Try to add items anyway (cart might not exist yet)
                    this.addItemsSequentially(validItems, 0, resolve, reject);
                }
            });
        });
    }

    private addItemsSequentially(items: any[], index: number, resolve: () => void, reject: (err: any) => void): void {
        if (index >= items.length) {
            console.log('All cart items synced successfully');
            resolve();
            return;
        }

        const item = items[index];
        const productId = parseInt(item.id, 10);
        if (isNaN(productId) || productId <= 0) {
            console.error('Invalid product ID:', item.id, 'for item:', item);
            this.addItemsSequentially(items, index + 1, resolve, reject);
            return;
        }

        const cartItemRequest = {
            productId: productId,
            quantity: item.quantity || 1
        };

        console.log('Syncing cart item:', cartItemRequest);

        this.http.post(`${environment.apiUrl}/cart`, cartItemRequest).subscribe({
            next: (response) => {
                console.log('Cart item synced successfully:', response);
                this.addItemsSequentially(items, index + 1, resolve, reject);
            },
            error: (err) => {
                console.error('Failed to sync cart item:', err);
                console.error('Error details:', {
                    status: err.status,
                    message: err.message,
                    error: err.error,
                    productId: productId,
                    item: item
                });

                // If product not found or inactive, skip it but continue
                if (err.status === 404) {
                    console.warn(`Product ${productId} not found, skipping`);
                    this.addItemsSequentially(items, index + 1, resolve, reject);
                } else if (err.status === 400) {
                    const errorMsg = err.error?.message || 'Invalid product';
                    console.warn(`Product ${productId} invalid: ${errorMsg}, skipping`);
                    this.addItemsSequentially(items, index + 1, resolve, reject);
                } else if (err.status === 500) {
                    // Server error - might be a database issue or product doesn't exist
                    console.error(`Server error for product ${productId}. Product might not exist in database.`);
                    // Still continue with other items
                    this.addItemsSequentially(items, index + 1, resolve, reject);
                } else {
                    // For other errors, continue but log
                    this.addItemsSequentially(items, index + 1, resolve, reject);
                }
            }
        });
    }

    private placeOrder(addressId: number): void {
        const paymentMethodMap: { [key: string]: string } = {
            'card': 'RAZORPAY',
            'cod': 'COD'
        };

        const paymentMethod = paymentMethodMap[this.formData().paymentMethod] || 'COD';

        const checkoutRequest: any = {
            addressId: addressId,
            paymentMethod: paymentMethod
        };

        this.http.post<any>(`${environment.apiUrl}/orders/checkout`, checkoutRequest)
            .subscribe({
                next: (order) => {
                    if (this.formData().paymentMethod === 'card') {
                        this.initiateRazorpayPayment(order.id);
                    } else {
                        this.isLoading.set(false);
                        this.cartService.clearCart();
                        this.router.navigate(['/orders']);
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    console.error('Order creation failed:', err);
                    if (err.status === 400) {
                        const errorMsg = err.error?.message || 'Failed to place order';
                        if (errorMsg.includes('Cart empty') || errorMsg.includes('Cart not found')) {
                            this.errorMessage.set('Your cart is empty. Please add items to your cart before checkout.');
                        } else if (errorMsg.includes('Insufficient stock')) {
                            this.errorMessage.set('One or more items in your cart are no longer available. Please go back to cart and update quantities.');
                        } else {
                            this.errorMessage.set(errorMsg);
                        }
                    } else if (err.status === 403) {
                        this.errorMessage.set('Access denied. Please ensure you are logged in.');
                    } else if (err.status === 500) {
                        this.errorMessage.set('Server error. Please ensure all products in your cart exist in the catalog.');
                    } else {
                        this.errorMessage.set('Failed to place order. Please try again.');
                    }
                }
            });
    }

    private initiateRazorpayPayment(orderId: number): void {
        this.http.post<any>(`${environment.apiUrl}/orders/${orderId}/razorpay`, {})
            .subscribe({
                next: (response) => {
                    this.openRazorpayCheckout(orderId, response);
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Failed to initiate payment. Please try again.');
                    console.error('Razorpay initiation failed:', err);
                }
            });
    }

    private openRazorpayCheckout(orderId: number, paymentData: any): void {
        const options = {
            key: paymentData.key,
            amount: paymentData.amount,
            currency: paymentData.currency,
            name: 'RevCart',
            description: `Order #${orderId}`,
            order_id: paymentData.orderId,
            handler: (response: any) => {
                this.verifyPayment(orderId, response);
            },
            modal: {
                ondismiss: () => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Payment cancelled. Your order is created but payment is pending.');
                }
            },
            theme: {
                color: '#10b981'
            }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    }

    private verifyPayment(orderId: number, paymentResponse: any): void {
        this.http.post(`${environment.apiUrl}/orders/${orderId}/verify-payment`, paymentResponse)
            .subscribe({
                next: () => {
                    this.isLoading.set(false);
                    this.cartService.clearCart();
                    this.router.navigate(['/orders']);
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Payment verification failed. Please contact support.');
                    console.error('Payment verification failed:', err);
                }
            });
    }
}
