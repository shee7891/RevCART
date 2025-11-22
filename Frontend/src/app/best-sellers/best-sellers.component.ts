import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BestSellersService } from './best-sellers.service';
import { ProductCardComponent } from './product-card/product-card.component';


export interface Product {
id: number;
name: string;
imageUrl: string;
category: string;
rating: number;
reviews: number;
price: number;
unit: string;
}


@Component({
selector: 'app-best-sellers',
standalone: true,
imports: [CommonModule, ProductCardComponent],
templateUrl: './best-sellers.component.html',
styleUrls: ['./best-sellers.component.css']
})
export class BestSellersComponent implements OnInit {
products: Product[] = [];


constructor(private bestSellersService: BestSellersService) {}


ngOnInit(): void {
this.bestSellersService.getBestSellers().subscribe(p => this.products = p);
}
}