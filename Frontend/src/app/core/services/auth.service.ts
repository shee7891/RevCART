import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, of, delay } from 'rxjs';
import { User, LoginCredentials, SignupData } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(true);

  // Computed signals
  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => this.userSignal() !== null);
  isLoading = this.loadingSignal.asReadonly();

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // ⛔ Prevents "localStorage is not defined" during Vite/SSR
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingSignal.set(false);
      return;
    }

    const storedUser = localStorage.getItem('revcart_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.userSignal.set(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('revcart_user');
      }
    }

    this.loadingSignal.set(false);
  }

  login(credentials: LoginCredentials): Observable<User> {
    const mockUser: User = {
      id: '1',
      email: credentials.email,
      name: credentials.email.split('@')[0],
      role: credentials.email.includes('admin') ? 'admin' :
            credentials.email.includes('delivery') ? 'delivery_agent' : 'customer'
    };

    this.userSignal.set(mockUser);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('revcart_user', JSON.stringify(mockUser));
    }

    return of(mockUser).pipe(delay(500));
  }

  signup(data: SignupData): Observable<User> {
    const newUser: User = {
      id: Date.now().toString(),
      email: data.email,
      name: data.name,
      phone: data.phone,
      role: 'customer'
    };

    this.userSignal.set(newUser);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('revcart_user', JSON.stringify(newUser));
    }

    return of(newUser).pipe(delay(500));
  }

  logout(): void {
    this.userSignal.set(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('revcart_user');
    }

    this.router.navigate(['/auth/login']);
  }

  hasRole(role: string): boolean {
    return this.userSignal()?.role === role;
  }
}
