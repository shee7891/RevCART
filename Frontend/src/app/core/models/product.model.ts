export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId: string;
  image: string;
  unit: string;
  description: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  originalPrice?: number;
  discount?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
}
