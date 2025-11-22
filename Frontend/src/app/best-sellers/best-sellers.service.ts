import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from './best-sellers.component';


@Injectable({ providedIn: 'root' })
export class BestSellersService {
private products: Product[] = [];


constructor() {
for (let i = 1; i <= 30; i++) {
this.products.push({
id: i,
name: this.mockName(i),
category: this.mockCategory(i),
imageUrl: `/assets/product${i}.jpeg`,
rating: +(Math.random() * 1.2 + 3.8).toFixed(1),
reviews: Math.floor(Math.random() * 200) + 10,
price: +(Math.random() * 8 + 1).toFixed(2),
unit: i % 5 === 0 ? 'per kg' : i % 4 === 0 ? 'per pack' : 'each'
});
}
}


getBestSellers(): Observable<Product[]> {
return of(this.products);
}


mockName(i: number): string {
const names = ['Potato Chips','Bananas','Frozen Pizza','Whole Wheat Bread','Orange Juice','Green Apples','Croissants','Whole Milk','Chicken Breast','Fresh Tomatoes','Organic Carrots','Cheddar Cheese','Almonds','Yogurt Pack','Strawberries','Blueberries','Granola','Olive Oil','Butter','Eggs','Spinach','Bell Pepper','Cucumber','Lettuce','Mango','Pineapple','Salmon','Tuna','Beef Steak','Brown Rice'];
return names[(i - 1) % names.length];
}


mockCategory(i: number): string {
const cats = ['Snacks','Fruits','Frozen','Bakery','Beverages','Fruits','Bakery','Dairy','Meat','Vegetables','Vegetables','Dairy','Dry Fruit','Dairy','Fruits','Fruits','Breakfast','Grocery','Dairy','Dairy','Vegetables','Vegetables','Vegetables','Vegetables','Fruits','Fruits','Seafood','Seafood','Meat','Grocery'];
return cats[(i - 1) % cats.length];
}
}