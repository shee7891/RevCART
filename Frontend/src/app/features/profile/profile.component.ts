import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { LucideAngularModule, User, MapPin, Plus, Edit, Trash2, X, Save } from 'lucide-angular';

interface Address {
    id?: number;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    primaryAddress: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

type ProfileResponse = ApiResponse<any> | {
    fullName?: string;
    email?: string;
    phone?: string;
};

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './profile.component.html',
    // styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    authService = inject(AuthService);
    router = inject(Router);
    http = inject(HttpClient);

    // Icons
    readonly User = User;
    readonly MapPin = MapPin;
    readonly Plus = Plus;
    readonly Edit = Edit;
    readonly Trash2 = Trash2;
    readonly X = X;
    readonly Save = Save;

    // Form data
    profileData = signal({
        fullName: '',
        email: '',
        phone: ''
    });

    addresses = signal<Address[]>([]);
    showAddressModal = signal(false);
    editingAddress: Address | null = null;
    addressForm = signal<Address>({
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        primaryAddress: false
    });

    isLoading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    activeTab = signal<'profile' | 'addresses'>('profile');

    ngOnInit(): void {
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/auth/login']);
            return;
        }
        this.loadProfile();
        this.loadAddresses();
    }

    loadProfile(): void {
        this.isLoading.set(true);
        this.http.get<ProfileResponse>(`${environment.apiUrl}/profile`).subscribe({
            next: (response) => {
                const payload = this.extractProfilePayload(response);
                if (payload) {
                    this.profileData.set({
                        fullName: payload.fullName || '',
                        email: payload.email || '',
                        phone: payload.phone || ''
                    });
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load profile:', err);
                this.isLoading.set(false);
            }
        });
    }

    private extractProfilePayload(response: ProfileResponse | null | undefined) {
        if (!response) {
            return null;
        }
        if ('data' in response) {
            return response.data;
        }
        return response;
    }

    updateProfile(): void {
        this.isLoading.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        const payload = {
            fullName: this.profileData().fullName,
            phone: this.profileData().phone
        };

        this.http.put<ApiResponse<any>>(`${environment.apiUrl}/profile`, payload).subscribe({
            next: (response) => {
                this.isLoading.set(false);
                this.successMessage.set('Profile updated successfully');
                // Update auth service user data
                this.loadProfile();
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.errorMessage.set(err.error?.message || 'Failed to update profile');
                console.error('Failed to update profile:', err);
            }
        });
    }

    loadAddresses(): void {
        this.http.get<ApiResponse<Address[]>>(`${environment.apiUrl}/profile/addresses`).subscribe({
            next: (response) => {
                if (response.data) {
                    this.addresses.set(response.data);
                }
            },
            error: (err) => {
                console.error('Failed to load addresses:', err);
            }
        });
    }

    openAddAddressModal(): void {
        this.editingAddress = null;
        this.addressForm.set({
            line1: '',
            line2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
            primaryAddress: false
        });
        this.showAddressModal.set(true);
    }

    openEditAddressModal(address: Address): void {
        this.editingAddress = address;
        this.addressForm.set({ ...address });
        this.showAddressModal.set(true);
    }

    closeAddressModal(): void {
        this.showAddressModal.set(false);
        this.editingAddress = null;
    }

    saveAddress(): void {
        if (!this.addressForm().line1 || !this.addressForm().city || !this.addressForm().state || !this.addressForm().postalCode) {
            this.errorMessage.set('Please fill in all required fields');
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set('');

        const url = this.editingAddress
            ? `${environment.apiUrl}/profile/address/${this.editingAddress.id}`
            : `${environment.apiUrl}/profile/address`;

        const request = this.editingAddress
            ? this.http.put<ApiResponse<Address>>(url, this.addressForm())
            : this.http.post<ApiResponse<Address>>(url, this.addressForm());

        request.subscribe({
            next: () => {
                this.isLoading.set(false);
                this.closeAddressModal();
                this.loadAddresses();
                this.successMessage.set('Address saved successfully');
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.errorMessage.set(err.error?.message || 'Failed to save address');
                console.error('Failed to save address:', err);
            }
        });
    }

    deleteAddress(id: number): void {
        if (!confirm('Are you sure you want to delete this address?')) {
            return;
        }

        this.http.delete<ApiResponse<void>>(`${environment.apiUrl}/profile/address/${id}`).subscribe({
            next: () => {
                this.loadAddresses();
                this.successMessage.set('Address deleted successfully');
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Failed to delete address');
                console.error('Failed to delete address:', err);
            }
        });
    }
}