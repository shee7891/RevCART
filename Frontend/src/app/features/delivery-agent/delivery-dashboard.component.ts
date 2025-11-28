import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OrderService } from '../../../app/core/services/order.service';
import { Order } from '../../core/models/order.model';
import { environment } from '../../../environments/environment';
import { LucideAngularModule, Package, MapPin, Clock, CheckCircle } from 'lucide-angular';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface DeliveryStats {
  assigned: number;
  inTransit: number;
  deliveredToday: number;
  pending: number;
}

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold mb-8">Delivery Dashboard</h1>

        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg border">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Assigned</h3>
              <lucide-icon [img]="Package" class="h-5 w-5 text-blue-600"></lucide-icon>
            </div>
            <p class="text-3xl font-bold">{{ assignedOrders.length }}</p>
            <p class="text-xs text-blue-600 mt-1">Orders assigned to you</p>
          </div>

          <div class="bg-white p-6 rounded-lg border">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">In Transit</h3>
              <lucide-icon [img]="MapPin" class="h-5 w-5 text-orange-600"></lucide-icon>
            </div>
            <p class="text-3xl font-bold">{{ inTransitOrders.length }}</p>
            <p class="text-xs text-orange-600 mt-1">Currently delivering</p>
          </div>

          <div class="bg-white p-6 rounded-lg border">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Delivered Today</h3>
              <lucide-icon [img]="CheckCircle" class="h-5 w-5 text-green-600"></lucide-icon>
            </div>
            <p class="text-3xl font-bold">{{ deliveredToday }}</p>
            <p class="text-xs text-green-600 mt-1">Completed today</p>
          </div>

          <div class="bg-white p-6 rounded-lg border">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Pending</h3>
              <lucide-icon [img]="Clock" class="h-5 w-5 text-yellow-600"></lucide-icon>
            </div>
            <p class="text-3xl font-bold">{{ pendingOrders.length }}</p>
            <p class="text-xs text-yellow-600 mt-1">Awaiting assignment</p>
          </div>
        </div>

        @if (isLoading) {
          <div class="text-center py-8">
            <p class="text-muted-foreground">Loading deliveries...</p>
          </div>
        } @else {
        <!-- Assigned Orders -->
        <div class="bg-white rounded-lg border p-6">
          <h2 class="text-xl font-bold mb-4">Assigned Deliveries</h2>
          <div class="space-y-4">
            @for (order of assignedOrders; track order.id) {
              <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-semibold">Order #{{ order.id }}</h3>
                    <p class="text-sm text-muted-foreground">{{ order.date }}</p>
                  </div>
                  <span
                    class="px-3 py-1 rounded-full text-sm"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800': order.status === 'processing',
                      'bg-blue-100 text-blue-800': order.status === 'in_transit',
                      'bg-green-100 text-green-800': order.status === 'delivered'
                    }"
                  >
                    {{ order.status | titlecase }}
                  </span>
                </div>

                <div class="flex items-start gap-2 mb-3">
                  <lucide-icon [img]="MapPin" class="h-4 w-4 text-muted-foreground mt-1"></lucide-icon>
                  <p class="text-sm">{{ order.deliveryAddress }}</p>
                </div>

                <div class="flex justify-between items-center">
                  <p class="font-semibold">\₹{{ order.total.toFixed(2) }}</p>
                  <div class="flex gap-2">
                    @if (order.status === 'processing') {
                      <button
                        (click)="updateOrderStatus(order.id, 'in_transit')"
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Start Delivery
                      </button>
                    }
                    @if (order.status === 'in_transit') {
                      <button
                        (click)="updateOrderStatus(order.id, 'delivered')"
                        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Mark Delivered
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
            @empty {
              <p class="text-center text-muted-foreground py-8">No assigned deliveries</p>
            }
          </div>
        </div>
        }
      </div>
    </div>
  `
})
export class DeliveryDashboardComponent implements OnInit {
  orderService = inject(OrderService);
  http = inject(HttpClient);

  readonly Package = Package;
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;

  assignedOrders: Order[] = [];
  inTransitOrders: Order[] = [];
  pendingOrders: Order[] = [];
  deliveredToday = 0;
  isLoading = false;

  ngOnInit(): void {
    this.loadDeliveries();
  }

  loadDeliveries(): void {
    this.isLoading = true;

    // Load statistics
    this.http.get<ApiResponse<DeliveryStats>>(`${environment.apiUrl}/delivery/stats`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.deliveredToday = response.data.deliveredToday;
        }
      },
      error: (err) => {
        console.error('Failed to load delivery statistics:', err);
      }
    });

    // Load assigned orders
    this.http.get<ApiResponse<Order[]>>(`${environment.apiUrl}/delivery/orders/assigned`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.assignedOrders = response.data.map(this.mapBackendOrder);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load assigned orders:', err);
        this.isLoading = false;
      }
    });

    // Load in transit orders
    this.http.get<ApiResponse<Order[]>>(`${environment.apiUrl}/delivery/orders/in-transit`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.inTransitOrders = response.data.map(this.mapBackendOrder);
        }
      },
      error: (err) => {
        console.error('Failed to load in transit orders:', err);
      }
    });

    // Load pending orders
    this.http.get<ApiResponse<Order[]>>(`${environment.apiUrl}/delivery/orders/pending`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.pendingOrders = response.data.map(this.mapBackendOrder);
        }
      },
      error: (err) => {
        console.error('Failed to load pending orders:', err);
      }
    });
  }

  updateOrderStatus(orderId: string, status: Order['status']): void {
    // Map frontend status to backend OrderStatus enum
    const statusMap: { [key: string]: string } = {
      'in_transit': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'processing': 'PACKED'
    };

    const backendStatus = statusMap[status] || status.toUpperCase();

    this.http.post<ApiResponse<any>>(`${environment.apiUrl}/delivery/orders/${orderId}/status`, {
      status: backendStatus,
      note: `Status updated to ${backendStatus}`
    }).subscribe({
      next: () => {
        this.loadDeliveries();
      },
      error: (err) => {
        console.error('Failed to update order status:', err);
        const errorMsg = err.error?.message || 'Failed to update order status. Please try again.';
        alert(errorMsg);
      }
    });
  }

  private mapBackendOrder = (dto: any): Order => ({
    id: String(dto.id),
    date: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString() : '',
    status: this.mapStatus(dto.status),
    items: dto.items ? dto.items.map((i: any) => ({
      id: String(i.productId),
      name: i.productName,
      quantity: i.quantity,
      price: Number(i.unitPrice)
    })) : [],
    total: Number(dto.totalAmount || 0),
    deliveryAddress: dto.shippingAddress
      ? `${dto.shippingAddress.line1}, ${dto.shippingAddress.city}, ${dto.shippingAddress.state} ${dto.shippingAddress.postalCode}`
      : ''
  });

  private mapStatus(backendStatus: string): Order['status'] {
    const statusMap: { [key: string]: Order['status'] } = {
      'PLACED': 'processing',
      'PACKED': 'processing',
      'OUT_FOR_DELIVERY': 'in_transit',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled'
    };
    return statusMap[backendStatus?.toUpperCase()] || 'processing';
  }
}
