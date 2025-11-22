import { Routes } from '@angular/router';

export const DELIVERY_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('../../../app/features/delivery-agent/delivery-dashboard.component').then(m => m.DeliveryDashboardComponent)
    }
];
