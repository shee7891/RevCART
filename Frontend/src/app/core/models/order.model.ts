export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  deliveryAddress: string;
}
