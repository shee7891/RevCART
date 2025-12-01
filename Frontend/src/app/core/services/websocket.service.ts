import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface NotificationMessage {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: any = null;
  private connected = new BehaviorSubject<boolean>(false);
  private notifications = new Subject<NotificationMessage>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  connected$ = this.connected.asObservable();
  notifications$ = this.notifications.asObservable();

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('WebSocket: Not in browser, skipping connection');
      return;
    }

    // Disconnect existing connection if any
    if (this.stompClient) {
      console.log('WebSocket: Disconnecting existing connection');
      this.disconnect();
    }

    const user = this.authService.user();
    if (!user || !user.id) {
      console.log('WebSocket: User not authenticated, skipping connection', { user });
      return;
    }

    console.log('WebSocket: Attempting to connect for user:', user.id);

    // Dynamically import SockJS and STOMP
    import('sockjs-client').then(SockJS => {
      import('@stomp/stompjs').then(STOMP => {
        const SockJSClass = (SockJS as any).default || SockJS;
        const StompClass = (STOMP as any).Client || (STOMP as any).default?.Client || STOMP.Client;

        const wsUrl = `${environment.apiUrl.replace('/api', '')}/ws`;
        console.log('WebSocket: Connecting to:', wsUrl);

        const socket = new SockJSClass(wsUrl);
        this.stompClient = new StompClass({
          webSocketFactory: () => socket,
          reconnectDelay: this.reconnectInterval,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          debug: (str: string) => {
            if (environment.production === false) {
              console.log('STOMP:', str);
            }
          }
        });

        this.stompClient.onConnect = (frame: any) => {
          console.log('✅ WebSocket connected successfully!', frame);
          this.connected.next(true);
          this.reconnectAttempts = 0;

          // Subscribe to user-specific notification topic
          // Backend sends to /topic/orders/{userId} where userId is Long
          // Frontend user.id is string, so we need to ensure they match
          const userId = user.id;
          const topic = `/topic/orders/${userId}`;
          console.log('WebSocket: Subscribing to topic:', topic);

          this.stompClient.subscribe(topic, (message: any) => {
            try {
              const notification: NotificationMessage = JSON.parse(message.body);
              console.log('🔔 Received notification:', notification);
              this.notifications.next(notification);
            } catch (error) {
              console.error('❌ Error parsing notification:', error, message.body);
            }
          });

          console.log('✅ WebSocket subscription active for topic:', topic);
        };

        this.stompClient.onStompError = (frame: any) => {
          console.error('❌ STOMP error:', frame);
          this.connected.next(false);
        };

        this.stompClient.onWebSocketClose = () => {
          console.log('⚠️ WebSocket closed');
          this.connected.next(false);
          this.attemptReconnect();
        };

        this.stompClient.onDisconnect = () => {
          console.log('⚠️ WebSocket disconnected');
          this.connected.next(false);
        };

        console.log('WebSocket: Activating STOMP client...');
        this.stompClient.activate();
      }).catch(error => {
        console.error('❌ Error loading STOMP library:', error);
      });
    }).catch(error => {
      console.error('❌ Error loading SockJS library:', error);
    });
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connected.next(false);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        if (this.authService.isAuthenticated()) {
          this.connect();
        }
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  sendNotification(notification: NotificationMessage): void {
    if (this.stompClient && this.connected.value) {
      this.stompClient.publish({
        destination: '/app/notification',
        body: JSON.stringify(notification)
      });
    }
  }
}

