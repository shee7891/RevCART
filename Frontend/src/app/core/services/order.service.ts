import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, catchError, map, throwError } from 'rxjs';
import { Order, OrderItem } from '../models/order.model';
import { environment } from '../../../environments/environment';

interface BackendOrderDto {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: BackendOrderItemDto[];
  deliveryAgentName?: string;
}

interface BackendOrderItemDto {
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private httpClient: HttpClient) { }

  private mapBackendOrderToFrontend = (backendOrder: BackendOrderDto): Order => {
    const statusMap: { [key: string]: 'processing' | 'in_transit' | 'delivered' | 'cancelled' } = {
      'PLACED': 'processing',
      'PACKED': 'processing',
      'OUT_FOR_DELIVERY': 'in_transit',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled'
    };

    const address = backendOrder.shippingAddress;
    const street = address.line2 ? `${address.line1}, ${address.line2}` : address.line1;
    const deliveryAddress = `${street}, ${address.city}, ${address.state} ${address.postalCode}`;

    return {
      id: String(backendOrder.id),
      date: new Date(backendOrder.createdAt).toISOString().split('T')[0],
      status: statusMap[backendOrder.status] || 'processing',
      items: backendOrder.items.map(item => ({
        id: String(item.productId),
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.unitPrice)
      })),
      total: Number(backendOrder.totalAmount),
      deliveryAddress: deliveryAddress
    };
  };

  getAllOrders(): Observable<Order[]> {
    // This should be used by admin - use admin endpoint
    return this.httpClient.get<PagedResponse<BackendOrderDto>>(`${environment.apiUrl}/admin/orders`, {
      params: new HttpParams().set('page', '0').set('size', '100')
    }).pipe(
      map(response => response.content.map(this.mapBackendOrderToFrontend)),
      catchError((error) => {
        console.warn('Backend orders unavailable, using empty array:', error);
        return of([]);
      })
    );
  }

  getUserOrders(userId: string): Observable<Order[]> {
    return this.httpClient.get<PagedResponse<BackendOrderDto>>(this.apiUrl, {
      params: new HttpParams().set('page', '0').set('size', '100')
    }).pipe(
      map(response => response.content.map(this.mapBackendOrderToFrontend)),
      catchError((error) => {
        console.warn('Backend user orders unavailable, using empty array:', error);
        return of([]);
      })
    );
  }

  getOrderById(orderId: string): Observable<Order | undefined> {
    return this.httpClient.get<BackendOrderDto>(`${this.apiUrl}/${orderId}`).pipe(
      map(backendOrder => this.mapBackendOrderToFrontend(backendOrder)),
      catchError((error) => {
        console.warn('Backend order unavailable:', error);
        return of(undefined);
      })
    );
  }

  createOrder(orderData: {
    items: OrderItem[];
    total: number;
    deliveryAddress: string;
  }): Observable<Order> {
    // Note: This method is kept for backward compatibility
    // The actual checkout flow is handled in checkout.component.ts
    // which creates an address first, then uses addressId for checkout
    console.warn('createOrder() is deprecated. Use checkout flow in checkout component instead.');
    return throwError(() => new Error('Use checkout flow instead of createOrder'));
  }

  updateOrderStatus(orderId: string, status: Order['status']): Observable<Order> {
    const statusMap: { [key: string]: string } = {
      'processing': 'PACKED',
      'in_transit': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED'
    };

    return this.httpClient.post<BackendOrderDto>(
      `${environment.apiUrl}/admin/orders/${orderId}/status`,
      { status: statusMap[status] }
    ).pipe(
      map(backendOrder => this.mapBackendOrderToFrontend(backendOrder)),
      catchError((error) => {
        console.error('Failed to update order status:', error);
        return throwError(() => error);
      })
    );
  }

  cancelOrder(orderId: string): Observable<boolean> {
    return this.httpClient.post<{ success: boolean; message: string; data: BackendOrderDto }>(
      `${this.apiUrl}/${orderId}/cancel`,
      null
    ).pipe(
      map(response => response.success),
      catchError((error) => {
        console.error('Failed to cancel order:', error);
        return throwError(() => error);
      })
    );
  }
}
