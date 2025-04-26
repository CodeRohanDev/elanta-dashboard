export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'vendor' | 'customer';
  photoURL?: string;
  createdAt: string;
  storeId?: string; // For vendors
}

export interface Store {
  id: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  ownerId: string;
  isVerified: boolean;
  createdAt: string;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  categories: string[];
  rating: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  storeId: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  features?: string[];
  specifications?: Record<string, string>;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  options: VariantOption[];
}

export interface VariantOption {
  id: string;
  value: string;
  priceAdjustment: number;
  stockQuantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  products: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt: string;
  shippingMethod: string;
  trackingNumber?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Dashboard {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  recentOrders: Order[];
  salesByDay: {date: string; amount: number}[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  parentId?: string;
  subcategories?: Category[];
} 