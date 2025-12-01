import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService, NotificationMessage } from '../../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { LucideAngularModule, X, CheckCircle, AlertCircle, Info } from 'lucide-angular';

interface ToastNotification extends NotificationMessage {
  visible: boolean;
  timeoutId?: any;
}

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <!-- Debug: Show notification count (temporary for debugging) -->
    <div *ngIf="notifications().length > 0" class="fixed top-4 right-4 z-[9999] bg-red-500 text-white p-2 text-xs rounded">
      🔔 Notifications: {{ notifications().length }}
    </div>

    <div class="fixed top-4 right-4 z-[9998] space-y-2 max-w-md w-full pointer-events-none" style="max-width: 400px;">
      <div
        *ngFor="let notification of notifications()"
        [class]="getNotificationClasses(notification)"
        class="notification-toast p-4 rounded-lg shadow-lg flex items-start gap-3 animate-slide-in pointer-events-auto"
      >
        <div class="flex-shrink-0 mt-0.5">
          <ng-container [ngSwitch]="notification.type">
            <lucide-icon *ngSwitchCase="'ORDER_STATUS'" [img]="CheckCircle" class="w-5 h-5 text-green-500" />
            <lucide-icon *ngSwitchCase="'PAYMENT'" [img]="CheckCircle" class="w-5 h-5 text-blue-500" />
            <lucide-icon *ngSwitchCase="'SYSTEM'" [img]="AlertCircle" class="w-5 h-5 text-yellow-500" />
            <lucide-icon *ngSwitchDefault [img]="Info" class="w-5 h-5 text-gray-500" />
          </ng-container>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ getNotificationTitle(notification.type) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {{ notification.message }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ formatDate(notification.createdAt) }}
          </p>
        </div>
        <button
          (click)="dismissNotification(notification.id)"
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Dismiss notification"
        >
          <lucide-icon [img]="X" class="w-4 h-4" />
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    .notification-toast {
      backdrop-filter: blur(10px);
    }
  `]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  private webSocketService = inject(WebSocketService);
  private subscription?: Subscription;

  notifications = signal<ToastNotification[]>([]);

  // Icons
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly Info = Info;
  readonly X = X;

  constructor() {
    // Expose test method globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).testNotification = () => this.testNotification();
    }
  }

  ngOnInit(): void {
    console.log('🔔 NotificationToastComponent initialized');
    // Subscribe to WebSocket notifications
    this.subscription = this.webSocketService.notifications$.subscribe(
      (notification: NotificationMessage) => {
        console.log('🔔 NotificationToastComponent received notification:', notification);
        this.addNotification(notification);
      }
    );

    // Log current notification count
    console.log('🔔 Current notifications count:', this.notifications().length);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    // Clear all timeouts
    this.notifications().forEach(notif => {
      if (notif.timeoutId) {
        clearTimeout(notif.timeoutId);
      }
    });
  }

  private addNotification(notification: NotificationMessage): void {
    console.log('🔔 Adding notification to display:', notification);
    const toastNotification: ToastNotification = {
      ...notification,
      visible: true
    };

    // Add to the beginning of the array
    this.notifications.update(notifs => {
      const updated = [toastNotification, ...notifs];
      console.log('🔔 Updated notifications array, count:', updated.length);
      return updated;
    });

    // Auto-dismiss after 5 seconds
    const timeoutId = setTimeout(() => {
      console.log('🔔 Auto-dismissing notification:', notification.id);
      this.dismissNotification(notification.id);
    }, 5000);

    toastNotification.timeoutId = timeoutId;

    // Keep only last 5 notifications visible
    if (this.notifications().length > 5) {
      const oldest = this.notifications()[this.notifications().length - 1];
      this.dismissNotification(oldest.id);
    }

    console.log('🔔 Notification added successfully, total count:', this.notifications().length);
  }

  dismissNotification(id: string): void {
    this.notifications.update(notifs => {
      const notif = notifs.find(n => n.id === id);
      if (notif && notif.timeoutId) {
        clearTimeout(notif.timeoutId);
      }
      return notifs.filter(n => n.id !== id);
    });
  }

  getNotificationClasses(notification: ToastNotification): string {
    const baseClasses = 'bg-white dark:bg-gray-800 border';
    const typeClasses: { [key: string]: string } = {
      'ORDER_STATUS': 'border-green-200 dark:border-green-700',
      'PAYMENT': 'border-blue-200 dark:border-blue-700',
      'SYSTEM': 'border-yellow-200 dark:border-yellow-700',
      'PROMOTION': 'border-purple-200 dark:border-purple-700'
    };
    return `${baseClasses} ${typeClasses[notification.type] || 'border-gray-200 dark:border-gray-700'}`;
  }

  getNotificationTitle(type: string): string {
    const titles: { [key: string]: string } = {
      'ORDER_STATUS': 'Order Update',
      'PAYMENT': 'Payment Confirmation',
      'SYSTEM': 'System Notification',
      'PROMOTION': 'Promotion'
    };
    return titles[type] || 'Notification';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Test method - can be called from browser console
  testNotification(): void {
    console.log('🔔 Testing notification display...');
    const testNotif: NotificationMessage = {
      id: 'test-' + Date.now(),
      type: 'ORDER_STATUS',
      message: 'This is a test notification!',
      read: false,
      createdAt: new Date().toISOString()
    };
    this.addNotification(testNotif);
  }
}

