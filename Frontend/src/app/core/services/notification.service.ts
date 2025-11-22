import { Injectable } from '@angular/core';

export interface Notification {
    title: string;
    description?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    show(notification: Notification): void {
        // In a real app, integrate with a toast library like ng-toast or primeng toast
        console.log(`[${notification.type?.toUpperCase() || 'INFO'}] ${notification.title}`, notification.description);

        // For now, use browser alert as fallback
        // Replace this with actual toast notification in production
        if (notification.type === 'error') {
            alert(`Error: ${notification.title}\n${notification.description || ''}`);
        }
    }

    success(title: string, description?: string): void {
        this.show({ title, description, type: 'success' });
    }

    error(title: string, description?: string): void {
        this.show({ title, description, type: 'error' });
    }

    info(title: string, description?: string): void {
        this.show({ title, description, type: 'info' });
    }

    warning(title: string, description?: string): void {
        this.show({ title, description, type: 'warning' });
    }
}
