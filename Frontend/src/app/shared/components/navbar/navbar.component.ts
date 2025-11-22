import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { LucideAngularModule, ShoppingCart, User, Search, Menu, Heart } from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);
  router = inject(Router);

  searchQuery = '';
  showMobileMenu = false;
  showUserMenu = false;

  // Icons
  readonly ShoppingCart = ShoppingCart;
  readonly User = User;
  readonly Search = Search;
  readonly Menu = Menu;
  readonly Heart = Heart;

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], {
        queryParams: { search: this.searchQuery }
      });
      this.searchQuery = '';
    }
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }
}
