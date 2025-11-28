import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LucideAngularModule, User, Shield, Truck, ShoppingCart, ToggleLeft, ToggleRight } from 'lucide-angular';

interface UserDto {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background py-8">
      <div class="container mx-auto px-4">
        <h1 class="text-3xl font-bold mb-6">Manage Users</h1>

        <!-- Users Table -->
        <div class="bg-white rounded-lg border overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (user of users; track user.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 font-medium">{{ user.fullName }}</td>
                  <td class="px-6 py-4">{{ user.email }}</td>
                  <td class="px-6 py-4">{{ user.phone || 'N/A' }}</td>
                  <td class="px-6 py-4">
                    <select
                      [value]="user.role"
                      (change)="updateRole(user.id, $event)"
                      class="px-2 py-1 rounded text-xs border"
                      [ngClass]="getRoleClass(user.role)"
                    >
                      <option value="CUSTOMER">Customer</option>
                      <option value="ADMIN">Admin</option>
                      <option value="DELIVERY_AGENT">Delivery Agent</option>
                    </select>
                  </td>
                  <td class="px-6 py-4">
                    <button
                      (click)="toggleStatus(user)"
                      class="flex items-center gap-2"
                    >
                      @if (user.active) {
                        <lucide-icon [img]="ToggleRight" class="h-5 w-5 text-green-600"></lucide-icon>
                        <span class="text-green-600 text-sm">Active</span>
                      } @else {
                        <lucide-icon [img]="ToggleLeft" class="h-5 w-5 text-gray-400"></lucide-icon>
                        <span class="text-gray-400 text-sm">Inactive</span>
                      }
                    </button>
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="px-2 py-1 rounded-full text-xs"
                      [ngClass]="user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                    >
                      {{ user.emailVerified ? 'Verified' : 'Pending' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex gap-2">
                      <button
                        (click)="viewUser(user)"
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        [title]="getRoleIcon(user.role)"
                      >
                        @if (user.role === 'ADMIN') {
                          <lucide-icon [img]="Shield" class="h-4 w-4"></lucide-icon>
                        } @else if (user.role === 'DELIVERY_AGENT') {
                          <lucide-icon [img]="Truck" class="h-4 w-4"></lucide-icon>
                        } @else {
                          <lucide-icon [img]="ShoppingCart" class="h-4 w-4"></lucide-icon>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages > 1) {
          <div class="mt-4 flex justify-center gap-2">
            <button
              (click)="loadPage(currentPage - 1)"
              [disabled]="currentPage === 0"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span class="px-4 py-2">{{ currentPage + 1 }} / {{ totalPages }}</span>
            <button
              (click)="loadPage(currentPage + 1)"
              [disabled]="currentPage >= totalPages - 1"
              class="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        }

        <!-- User Detail Modal -->
        @if (selectedUser) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full">
              <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-2xl font-bold">{{ selectedUser.fullName }}</h2>
                  <button (click)="selectedUser = null" class="p-2 hover:bg-gray-100 rounded">×</button>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="text-sm font-medium text-gray-500">Email</label>
                    <p class="mt-1">{{ selectedUser.email }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Phone</label>
                    <p class="mt-1">{{ selectedUser.phone || 'N/A' }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Role</label>
                    <p class="mt-1">
                      <span [ngClass]="getRoleClass(selectedUser.role)" class="px-2 py-1 rounded text-sm">
                        {{ selectedUser.role }}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Status</label>
                    <p class="mt-1">
                      <span [ngClass]="selectedUser.active ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                        {{ selectedUser.active ? 'Active' : 'Inactive' }}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Email Verified</label>
                    <p class="mt-1">
                      <span [ngClass]="selectedUser.emailVerified ? 'text-green-600' : 'text-yellow-600'" class="text-sm">
                        {{ selectedUser.emailVerified ? 'Yes' : 'No' }}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-500">Member Since</label>
                    <p class="mt-1">{{ formatDate(selectedUser.createdAt) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  http = inject(HttpClient);

  users: UserDto[] = [];
  selectedUser: UserDto | null = null;
  currentPage = 0;
  totalPages = 1;

  readonly User = User;
  readonly Shield = Shield;
  readonly Truck = Truck;
  readonly ShoppingCart = ShoppingCart;
  readonly ToggleLeft = ToggleLeft;
  readonly ToggleRight = ToggleRight;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<PagedResponse<UserDto>>(`${environment.apiUrl}/admin/users?page=${this.currentPage}&size=20`)
      .subscribe({
        next: (response) => {
          this.users = response.content;
          this.totalPages = response.totalPages;
        },
        error: (err) => {
          console.error('Failed to load users:', err);
        }
      });
  }

  updateRole(userId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value;

    this.http.put<ApiResponse<UserDto>>(`${environment.apiUrl}/admin/users/${userId}/role`, {
      role: newRole
    }).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: () => {
        alert('Failed to update user role');
        this.loadUsers();
      }
    });
  }

  toggleStatus(user: UserDto): void {
    const newStatus = !user.active;
    this.http.put<ApiResponse<UserDto>>(`${environment.apiUrl}/admin/users/${user.id}/status`, {
      active: newStatus
    }).subscribe({
      next: () => {
        user.active = newStatus;
      },
      error: () => {
        alert('Failed to update user status');
        this.loadUsers();
      }
    });
  }

  viewUser(user: UserDto): void {
    this.http.get<UserDto>(`${environment.apiUrl}/admin/users/${user.id}`).subscribe({
      next: (fullUser) => {
        this.selectedUser = fullUser;
      },
      error: () => {
        this.selectedUser = user;
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  getRoleClass(role: string): string {
    const classes: { [key: string]: string } = {
      'CUSTOMER': 'bg-blue-100 text-blue-800',
      'ADMIN': 'bg-purple-100 text-purple-800',
      'DELIVERY_AGENT': 'bg-green-100 text-green-800'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  getRoleIcon(role: string): string {
    return role === 'ADMIN' ? 'Admin' : role === 'DELIVERY_AGENT' ? 'Delivery Agent' : 'Customer';
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }
}

