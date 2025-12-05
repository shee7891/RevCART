export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  unit: string;
  availableQuantity?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}
