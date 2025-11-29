import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Mail, Lock, User, Phone, ShoppingCart } from 'lucide-angular';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-xl p-8">
          <!-- Logo -->
          <div class="flex items-center justify-center gap-2 mb-6">
            <lucide-icon [img]="ShoppingCart" class="h-8 w-8 text-primary"></lucide-icon>
            <h1 class="text-2xl font-bold">RevCart</h1>
          </div>

          <h2 class="text-2xl font-bold text-center mb-6">Create Account</h2>

          <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {{ errorMessage }}
          </div>

          <form (ngSubmit)="onSignup()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Full Name</label>
              <div class="relative">
                <lucide-icon [img]="UserIcon" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="text"
                  [(ngModel)]="name"
                  name="name"
                  required
                  placeholder="John Doe"
                  class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <div class="relative">
                <lucide-icon [img]="Mail" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Phone (Optional)</label>
              <div class="relative">
                <lucide-icon [img]="PhoneIcon" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="tel"
                  [(ngModel)]="phone"
                  name="phone"
                  placeholder="+1 234 567 8900"
                  class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Password</label>
              <div class="relative">
                <lucide-icon [img]="Lock" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Confirm Password</label>
              <div class="relative">
                <lucide-icon [img]="Lock" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  class="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Register As</label>
              <div class="grid grid-cols-1 gap-2">
                <div *ngFor="let roleOption of roles" class="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors" [ngClass]="{'border-primary': role === roleOption.value, 'bg-primary/5': role === roleOption.value}">
                  <input type="radio" [(ngModel)]="role" [value]="roleOption.value" name="role" [id]="'role-' + roleOption.value" class="mr-3" />
                  <label [for]="'role-' + roleOption.value" class="flex-1 cursor-pointer">
                    <div class="font-medium text-sm">{{ roleOption.label }}</div>
                    <div class="text-xs text-gray-500">{{ roleOption.description }}</div>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="isLoading"
              class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {{ isLoading ? 'Creating account...' : 'Sign Up' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm">
            <p class="text-gray-600">
              Already have an account?
              <a routerLink="/auth/login" class="text-primary hover:underline font-medium">Login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SignupComponent {
  authService = inject(AuthService);
  router = inject(Router);

  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  role: 'CUSTOMER' | 'ADMIN' | 'DELIVERY_AGENT' = 'CUSTOMER';
  isLoading = false;
  errorMessage = '';

  roles = [
    { value: 'CUSTOMER', label: 'Customer', description: 'Shop for groceries and place orders' },
    { value: 'ADMIN', label: 'Admin', description: 'Manage products, orders, and users' },
    { value: 'DELIVERY_AGENT', label: 'Delivery Agent', description: 'Manage and deliver orders' }
  ];

  // Icons
  readonly ShoppingCart = ShoppingCart;
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly UserIcon = User;
  readonly PhoneIcon = Phone;

  onSignup(): void {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.signup({
      name: this.name,
      email: this.email,
      password: this.password,
      phone: this.phone,
      role: this.role
    }).subscribe({
      next: () => {
        this.isLoading = false;
        // Redirect to OTP verification page
        this.router.navigate(['/auth/verify-otp'], { queryParams: { email: this.email } });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to create account. Please try again.';
      }
    });
  }
}
