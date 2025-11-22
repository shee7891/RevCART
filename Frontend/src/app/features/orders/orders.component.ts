import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Order } from '../../core/models/order.model';
import { LucideAngularModule, Package, Truck, CheckCircle, XCircle } from 'lucide-angular';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './orders.component.html',
    // styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
    orders = signal<Order[]>([]);

    // Icons
    readonly Package = Package;
    readonly Truck = Truck;
    readonly CheckCircle = CheckCircle;
    readonly XCircle = XCircle;

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        // Mock orders data
        const mockOrders: Order[] = [
            {
                id: 'ORD-001',
                date: '2024-01-15',
                status: 'delivered',
                items: [
                    { id: '1', name: 'Fresh Tomatoes', quantity: 2, price: 2.99 },
                    { id: '2', name: 'Organic Bananas', quantity: 1, price: 1.99 }
                ],
                total: 7.97,
                deliveryAddress: '123 Main St, City, 12345'
            },
            {
                id: 'ORD-002',
                date: '2024-01-20',
                status: 'in_transit',
                items: [
                    { id: '3', name: 'Fresh Milk', quantity: 2, price: 3.49 }
                ],
                total: 6.98,
                deliveryAddress: '123 Main St, City, 12345'
            }
        ];
        this.orders.set(mockOrders);
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
