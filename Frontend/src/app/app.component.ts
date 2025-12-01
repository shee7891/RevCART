import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';
import { WebSocketService } from './core/services/websocket.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, NotificationToastComponent],
  template: `
    <div class="flex flex-col min-h-screen">
      <app-navbar></app-navbar>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
      <app-notification-toast></app-notification-toast>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'revcart';
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);

  constructor() {
    // Watch authentication state changes using effect
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const user = this.authService.user();
      console.log('🔐 Auth state changed:', { isAuth, user: user?.id });

      if (isAuth && user?.id) {
        // Small delay to ensure auth state is fully initialized
        setTimeout(() => {
          console.log('🔌 Attempting WebSocket connection...');
          this.webSocketService.connect();
        }, 1000);
      } else {
        console.log('🔌 Disconnecting WebSocket (user not authenticated)');
        this.webSocketService.disconnect();
      }
    });
  }

  ngOnInit(): void {
    // Check initial auth state
    const user = this.authService.user();
    if (this.authService.isAuthenticated() && user?.id) {
      console.log('🔌 Initial WebSocket connection attempt for user:', user.id);
      setTimeout(() => {
        this.webSocketService.connect();
      }, 1000);
    } else {
      console.log('🔌 No initial WebSocket connection (user not authenticated)');
    }
  }

  ngOnDestroy(): void {
    this.webSocketService.disconnect();
  }
}
