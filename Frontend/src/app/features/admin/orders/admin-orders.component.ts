import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule, Eye, Package } from 'lucide-angular';

interface OrderDto {
  id: number;
  orderNumber?: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
  items: Array<{
    productId: number;
    productName: string;
    productImageUrl?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold mb-6">Manage Orders</h1>

        <!-- Orders Table -->
        <div class="bg-white rounded-lg border overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (order of orders; track order.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 font-medium">#{{ order.orderNumber || order.id }}</td>
                  <td class="px-6 py-4">
                    <div>
                      <div class="font-medium">{{ order.user ? order.user.fullName : 'N/A' }}</div>
                      <div class="text-sm text-gray-500">{{ order.user ? order.user.email : '' }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4">{{ formatDate(order.createdAt) }}</td>
                  <td class="px-6 py-4">{{ order.items ? order.items.length : 0 }} items</td>
                  <td class="px-6 py-4 font-medium">₹{{ order.totalAmount ? order.totalAmount.toFixed(2) : '0.00' }}</td>
                  <td class="px-6 py-4">
                    <select
                      [value]="order.status"
                      (change)="updateStatus(order.id, $event)"
                      class="px-2 py-1 rounded text-xs border"
                      [ngClass]="getStatusClass(order.status)"
                    >
                      <option value="PLACED">Placed</option>
                      <option value="PACKED">Packed</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs"
                      [ngClass]="getPaymentStatusClass(order.paymentStatus)"
                    >
                      {{ order.paymentStatus }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <button
                      (click)="viewOrder(order)"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <lucide-icon [img]="Eye" class="h-4 w-4"></lucide-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
          <div class="mt-4 flex justify-center gap-2">
            <button
              (click)="loadPage(currentPage - 1)"
              [disabled]="currentPage === 0"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span class="px-4 py-2">{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button
              (click)="loadPage(currentPage + 1)"
              [disabled]="currentPage >= totalPages - 1"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        }

        <!-- Order Detail Modal -->
        @if (selectedOrder) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-2xl font-bold">Order #{{ selectedOrder.orderNumber || selectedOrder.id }}</h2>
                  <button (click)="selectedOrder = null" class="p-2 hover:bg-gray-100 rounded">×</button>
                </div>

                <div class="space-y-4">
                  <div>
                    <h3 class="font-semibold mb-2">Customer Information</h3>
                    <p>{{ selectedOrder.user ? selectedOrder.user.fullName : 'N/A' }}</p>
                    <p class="text-sm text-gray-600">{{ selectedOrder.user ? selectedOrder.user.email : '' }}</p>
                  </div>

                  <div>
                    <h3 class="font-semibold mb-2">Shipping Address</h3>
                    @if (selectedOrder.shippingAddress) {
                      <p>{{ selectedOrder.shippingAddress.line1 }}</p>
                      <p>{{ selectedOrder.shippingAddress.city }}, {{ selectedOrder.shippingAddress.state }} {{ selectedOrder.shippingAddress.postalCode }}</p>
                    } @else {
                      <p>No address provided</p>
                    }
                  </div>

                  <div>
                    <h3 class="font-semibold mb-2">Order Items</h3>
                    <div class="space-y-2">
                      @for (item of selectedOrder.items; track item.productId) {
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div class="flex items-center gap-3">
                            @if (item.productImageUrl) {
                              <img [src]="item.productImageUrl" [alt]="item.productName" class="w-12 h-12 object-cover rounded">
                            } @else {
                              <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <lucide-icon [img]="Package" class="h-6 w-6 text-gray-400"></lucide-icon>
                              </div>
                            }
                            <div>
                              <div class="font-medium">{{ item.productName }}</div>
                              <div class="text-sm text-gray-600">Qty: {{ item.quantity }} × ₹{{ item.unitPrice.toFixed(2) }}</div>
                            </div>
                          </div>
                          <div class="font-medium">₹{{ item.subtotal.toFixed(2) }}</div>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="border-t pt-4">
                    <div class="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₹{{ selectedOrder.totalAmount.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminOrdersComponent implements OnInit {
  http = inject(HttpClient);

  orders: OrderDto[] = [];
  selectedOrder: OrderDto | null = null;
  currentPage = 0;
  totalPages = 1;

  readonly Eye = Eye;
  readonly Package = Package;

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.http.get<PagedResponse<OrderDto>>(`${environment.apiUrl}/admin/orders?page=${this.currentPage}&size=20`)
      .subscribe({
        next: (response) => {
          this.orders = response.content || [];
          this.totalPages = response.totalPages || 1;
          if (this.orders.length === 0) {
            console.log('No orders found');
          }
        },
        error: (err) => {
          console.error('Failed to load orders:', err);
          this.orders = [];
          this.totalPages = 1;
          if (err.status === 403) {
            alert('Access denied. Please ensure you are logged in as an administrator.');
          } else if (err.status === 401) {
            alert('Authentication required. Please log in again.');
          } else {
            alert('Failed to load orders. Please try again.');
          }
        }
      });
  }

  updateStatus(orderId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;

    this.http.post<any>(`${environment.apiUrl}/admin/orders/${orderId}/status`, {
      status: newStatus,
      note: `Status updated to ${newStatus}`
    }).subscribe({
      next: () => {
        this.loadOrders();
      },
      error: () => {
        alert('Failed to update order status');
        this.loadOrders();
      }
    });
  }

  viewOrder(order: OrderDto): void {
    this.http.get<OrderDto>(`${environment.apiUrl}/orders/${order.id}`).subscribe({
      next: (fullOrder) => {
        this.selectedOrder = fullOrder;
      },
      error: () => {
        this.selectedOrder = order;
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PLACED': 'bg-yellow-100 text-yellow-800',
      'PACKED': 'bg-blue-100 text-blue-800',
      'OUT_FOR_DELIVERY': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'SUCCESS': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }
}

