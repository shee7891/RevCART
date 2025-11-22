import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../best-sellers.component';


@Component({
selector: 'app-product-card',
standalone: true,
imports: [CommonModule],
templateUrl: './product-card.component.html',
styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent {
@Input() product!: Product;


stars(r: number): string {
const full = Math.floor(r);
const half = (r - full) >= 0.5 ? 1 : 0;
const empty = 5 - full - half;
return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(empty);
}
}