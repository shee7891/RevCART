import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Mail, Hash } from 'lucide-angular';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-xl p-8 space-y-6">
          <div class="text-center space-y-2">
            <h1 class="text-2xl font-bold">Verify Your Email</h1>
            <p class="text-sm text-gray-500">
              Enter the 6-digit OTP sent to your email address to activate your account.
            </p>
          </div>

          @if (successMessage) {
            <div class="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {{ successMessage }}
            </div>
          }

          @if (errorMessage) {
            <div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {{ errorMessage }}
            </div>
          }

          <form class="space-y-4" (ngSubmit)="onVerify()">
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <div class="relative">
                <lucide-icon [img]="MailIcon" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
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
              <label class="block text-sm font-medium mb-1">OTP Code</label>
              <div class="relative">
                <lucide-icon [img]="CodeIcon" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="text"
                  maxlength="6"
                  [(ngModel)]="otp"
                  name="otp"
                  required
                  placeholder="Enter 6-digit code"
                  class="w-full tracking-widest uppercase pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              [disabled]="isLoading"
              class="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {{ isLoading ? 'Verifying...' : 'Verify OTP' }}
            </button>
          </form>

          <div class="flex items-center justify-between text-sm">
            <button
              class="text-primary font-medium hover:underline disabled:opacity-50"
              [disabled]="resendDisabled"
              (click)="onResend()"
            >
              {{ resendDisabled ? 'OTP resent' : 'Resend OTP' }}
            </button>
            <a routerLink="/auth/login" class="text-gray-500 hover:text-primary">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VerifyOtpComponent {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  email = '';
  otp = '';
  isLoading = false;
  resendDisabled = false;
  successMessage = '';
  errorMessage = '';

  readonly MailIcon = Mail;
  readonly CodeIcon = Hash;

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const emailParam = params.get('email');
      if (emailParam) {
        this.email = emailParam;
      }
    });
  }

  onVerify(): void {
    if (!this.email || !this.otp) {
      this.errorMessage = 'Email and OTP are required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Email verified successfully. You can now log in.';
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Invalid OTP. Please try again.';
        } else {
          this.errorMessage = 'Verification failed. Please try again.';
        }
      }
    });
  }

  onResend(): void {
    if (!this.email) {
      this.errorMessage = 'Enter your email to resend OTP.';
      return;
    }

    this.resendDisabled = true;
    this.authService.resendOtp(this.email).subscribe({
      next: () => {
        this.successMessage = 'OTP resent. Check your email.';
        setTimeout(() => (this.resendDisabled = false), 10000);
      },
      error: () => {
        this.resendDisabled = false;
        this.errorMessage = 'Unable to resend OTP. Please try again.';
      }
    });
  }
}

