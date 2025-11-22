import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Order, OrderItem } from '../models/order.model';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private mockOrders: Order[] = [
        {
            id: 'ORD-001',
            date: '2024-01-15',
            status: 'delivered',
            items: [
                { id: '1', name: 'Fresh Tomatoes', quantity: 2, price: 2.99 },
                { id: '2', name: 'Organic Bananas', quantity: 1, price: 1.99 }
            ],
            total: 7.97,
            deliveryAddress: '123 Main St, City, State 12345'
        },
        {
            id: 'ORD-002',
            date: '2024-01-18',
            status: 'in_transit',
            items: [
                { id: '3', name: 'Fresh Milk', quantity: 2, price: 3.49 }
            ],
            total: 6.98,
            deliveryAddress: '456 Oak Ave, City, State 12345'
        },
        {
            id: 'ORD-003',
            date: '2024-01-20',
            status: 'processing',
            items: [
                { id: '4', name: 'Chicken Breast', quantity: 1, price: 8.99 },
                { id: '5', name: 'Brown Rice', quantity: 1, price: 4.99 }
            ],
            total: 13.98,
            deliveryAddress: '789 Pine Rd, City, State 12345'
        }
    ];

    getAllOrders(): Observable<Order[]> {
        return of(this.mockOrders).pipe(delay(300));
    }

    getUserOrders(userId: string): Observable<Order[]> {
        return of(this.mockOrders).pipe(delay(300));
    }

    getOrderById(orderId: string): Observable<Order | undefined> {
        const order = this.mockOrders.find(o => o.id === orderId);
        return of(order).pipe(delay(200));
    }

    createOrder(orderData: {
        items: OrderItem[];
        total: number;
        deliveryAddress: string;
    }): Observable<Order> {
        const newOrder: Order = {
            id: `ORD-${String(this.mockOrders.length + 1).padStart(3, '0')}`,
            date: new Date().toISOString().split('T')[0],
            status: 'processing',
            ...orderData
        };

        this.mockOrders.unshift(newOrder);
        return of(newOrder).pipe(delay(500));
    }

    updateOrderStatus(orderId: string, status: Order['status']): Observable<Order> {
        const order = this.mockOrders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
        }
        return of(order!).pipe(delay(300));
    }

    cancelOrder(orderId: string): Observable<boolean> {
        const order = this.mockOrders.find(o => o.id === orderId);
        if (order) {
            order.status = 'cancelled';
            return of(true).pipe(delay(300));
        }
        return of(false).pipe(delay(300));
    }
}
