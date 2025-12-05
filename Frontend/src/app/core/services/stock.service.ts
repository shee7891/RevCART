import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';

export interface StockValidationResult {
    isValid: boolean;
    insufficientItems: Array<{
        productId: string;
        productName: string;
        requestedQuantity: number;
        availableQuantity: number;
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class StockService {
    private apiUrl = `${environment.apiUrl}/products`;

    constructor(private httpClient: HttpClient) { }

    /**
     * Validate stock for all items in cart
     * @param cartItems Items from cart to validate
     * @returns StockValidationResult with validation status and details
     */
    validateCartStock(cartItems: CartItem[]): Observable<StockValidationResult> {
        if (cartItems.length === 0) {
            return new Observable(observer => {
                observer.next({
                    isValid: true,
                    insufficientItems: []
                });
                observer.complete();
            });
        }

        // Create requests to get latest product data for each item
        const stockCheckRequests = cartItems.map(item =>
            this.httpClient.get<any>(`${this.apiUrl}/${item.id}`).pipe(
                map(product => ({
                    ...item,
                    latestAvailableQuantity: product.availableQuantity || 0
                }))
            )
        );

        return forkJoin(stockCheckRequests).pipe(
            map(itemsWithLatestStock => {
                const insufficientItems = itemsWithLatestStock
                    .filter(item => (item.latestAvailableQuantity || 0) < item.quantity)
                    .map(item => ({
                        productId: item.id,
                        productName: item.name,
                        requestedQuantity: item.quantity,
                        availableQuantity: item.latestAvailableQuantity || 0
                    }));

                return {
                    isValid: insufficientItems.length === 0,
                    insufficientItems
                };
            })
        );
    }

    /**
     * Get current available quantity for a single product
     * @param productId Product ID to check
     * @returns Available quantity
     */
    getAvailableQuantity(productId: string): Observable<number> {
        return this.httpClient.get<any>(`${this.apiUrl}/${productId}`).pipe(
            map(product => product.availableQuantity || 0)
        );
    }
}
