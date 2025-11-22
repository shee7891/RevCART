import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, User, MapPin, Shield } from 'lucide-angular';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './profile.component.html',
    // styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
    authService = inject(AuthService);
    router = inject(Router);

    // Icons
    readonly User = User;
    readonly MapPin = MapPin;
    readonly Shield = Shield;

    // Form data
    profileData = signal({
        name: this.authService.user()?.name || '',
        email: this.authService.user()?.email || '',
        phone: this.authService.user()?.phone || ''
    });

    passwordData = signal({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    activeTab = signal<'profile' | 'addresses' | 'security'>('profile');

    ngOnInit(): void {
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/auth/login']);
        }
    }

    updateProfile(): void {
        console.log('Profile updated:', this.profileData());
        // Mock update - replace with actual API call
    }

    changePassword(): void {
        if (this.passwordData().newPassword !== this.passwordData().confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        console.log('Password changed');
        this.passwordData.set({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    }
}
