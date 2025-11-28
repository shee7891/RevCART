import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Order } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { LucideAngularModule, Package, Truck, CheckCircle, XCircle } from 'lucide-angular';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './orders.component.html',
    // styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
    private orderService = inject(OrderService);
    private router = inject(Router);
    orders = signal<Order[]>([]);
    isLoading = signal<boolean>(false);
    errorMessage = signal<string>('');

    // Icons
    readonly Package = Package;
    readonly Truck = Truck;
    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;

    ngOnInit(): void {
        this.loadOrders();
        // Reload orders when navigating to this page
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                if (this.router.url === '/orders') {
                    this.loadOrders();
                }
            });
    }

    loadOrders(): void {
        this.isLoading.set(true);
        this.errorMessage.set('');
        this.orderService.getUserOrders('').subscribe({
            next: (orders) => {
                this.orders.set(orders);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load orders:', err);
                this.errorMessage.set('Failed to load orders. Please try again.');
                this.isLoading.set(false);
                this.orders.set([]);
            }
        });
    }

    getStatusClass(status: Order['status']): string {
        const classes = {
            processing: 'bg-blue-100 text-blue-800',
            in_transit: 'bg-yellow-100 text-yellow-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return classes[status];
    }

    getStatusIcon(status: Order['status']) {
        const icons = {
            processing: this.Package,
            in_transit: this.Truck,
            delivered: this.CheckCircle,
            cancelled: this.XCircle
        };
        return icons[status];
    }

    getStatusText(status: Order['status']): string {
        const texts = {
            processing: 'Processing',
            in_transit: 'In Transit',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        return texts[status];
    }
}
