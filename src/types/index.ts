import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  // Basic Information
  displayName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'customer' | 'user';
  isActive: boolean;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
  storeId?: string;
  
  // Account Status
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string;
  accountStatus: 'active' | 'suspended' | 'deactivated';
  accountType: 'regular' | 'premium' | 'enterprise';
  
  // Contact Information
  addresses: {
    id: string;
    type: 'billing' | 'shipping';
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    phoneNumber?: string;
    label?: string; // e.g., "Home", "Office"
  }[];
  
  // Payment Information
  paymentMethods: {
    id: string;
    type: 'credit_card' | 'paypal' | 'bank_transfer' | 'apple_pay' | 'google_pay';
    provider?: string; // e.g., "Visa", "Mastercard"
    lastFourDigits?: string;
    expiryDate?: string;
    isDefault: boolean;
    billingAddressId?: string;
    isVerified: boolean;
  }[];
  
  // Preferences
  preferences: {
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
    marketingEmails: boolean;
    orderNotifications: boolean;
    newsletterSubscription: boolean;
    priceAlerts: boolean;
    stockNotifications: boolean;
    reviewReminders: boolean;
    abandonedCartReminders: boolean;
    personalizedRecommendations: boolean;
    socialMediaSharing: boolean;
  };
  
  // Loyalty Program
  loyaltyPoints: number;
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  loyaltyStatus: 'active' | 'inactive';
  loyaltyJoinDate?: string;
  loyaltyExpiryDate?: string;
  loyaltyBenefits: string[];
  
  // Shopping Behavior
  wishlist: {
    productId: string;
    addedAt: string;
    notes?: string;
  }[];
  recentlyViewed: {
    productId: string;
    viewedAt: string;
  }[];
  savedForLater: {
    productId: string;
    savedAt: string;
  }[];
  shoppingCart: {
    productId: string;
    quantity: number;
    addedAt: string;
  }[];
  
  // Order History
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  favoriteCategories: string[];
  favoriteBrands: string[];
  
  // Customer Support
  supportTickets: {
    id: string;
    subject: string;
    status: 'open' | 'pending' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    updatedAt: string;
  }[];
  refundHistory: {
    orderId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string;
  }[];
  
  // Social & Referral
  socialConnections: {
    provider: 'google' | 'facebook' | 'twitter' | 'apple';
    id: string;
    email?: string;
    connectedAt: string;
  }[];
  referralCode?: string;
  referredBy?: string;
  referralCount: number;
  referralEarnings: number;
  
  // Security
  twoFactorEnabled: boolean;
  securityQuestions: {
    question: string;
    answer: string;
  }[];
  lastPasswordChange?: string;
  failedLoginAttempts: number;
  accountLockedUntil?: string;
  
  // Communication Preferences
  notificationPreferences: {
    email: {
      orderUpdates: boolean;
      shippingUpdates: boolean;
      promotions: boolean;
      priceDrops: boolean;
      backInStock: boolean;
      reviews: boolean;
    };
    sms: {
      orderUpdates: boolean;
      shippingUpdates: boolean;
      promotions: boolean;
    };
    push: {
      orderUpdates: boolean;
      promotions: boolean;
      priceAlerts: boolean;
    };
  };
  
  // Additional Information
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  occupation?: string;
  companyName?: string;
  taxId?: string;
  vatNumber?: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  preferredShippingMethod?: string;
  preferredPaymentMethod?: string;
  
  // Custom Fields
  customFields: Record<string, any>;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  categories: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number | null;
  description: string;
  category: string;
  subcategory?: string;
  stock: number;
  images: string[];
  features?: string[];
  specifications?: Record<string, string>;
  createdAt: any;
  createdBy?: {
    uid: string;
    email: string;
  };
  updatedAt?: any;
  updatedBy?: {
    uid: string;
    email: string;
  };
  hasVariations?: boolean;
  variationTypes?: Array<{name: string, options: string[]}>;
  variations?: Array<{
    combination: Record<string, string>,
    price: number,
    stock: number,
    sku: string,
    images: string[]
  }>;
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

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedBy: string;
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

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStockThreshold: number;
  maxStockThreshold?: number;
  reorderQuantity?: number;
  locationCode?: string;
  lastRestocked?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  variantId?: string;
  variantName?: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  productId: string;
  type: 'restock' | 'adjustment' | 'sale' | 'return' | 'damage';
  quantity: number;
  previousStock: number;
  newStock: number;
  date: string;
  notes?: string;
  referenceId?: string;
  createdBy: string;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  code?: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'freeShipping';
  value: number; // percentage discount or fixed amount
  minPurchase?: number;
  maxDiscount?: number;
  applicableTo: 'all' | 'products' | 'categories';
  targetIds?: string[]; // product IDs or category IDs
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number; // max times a promotion can be used
  usageCount: number; // current usage count
  bannerImage?: string; // URL to promotion banner image
  createdAt: any;
  updatedAt?: any;
  createdBy: {
    uid: string;
    email: string;
  };
}

export interface Currency {
  id: string;          // Unique identifier in Firestore
  code: string;        // ISO 4217 currency code (e.g., USD, EUR, GBP)
  name: string;        // Full name of the currency
  symbol: string;      // Currency symbol (e.g., $, €, £)
  rate: number;        // Exchange rate relative to the base currency
  isDefault: boolean;  // Whether this is the default/base currency
  isActive: boolean;   // Whether this currency is currently active
  decimals: number;    // Number of decimal places typically shown
  createdAt?: any;
  updatedAt?: any;
}

export interface StoreSettings {
  id: string;
  baseCurrency: string;  // ISO currency code of the base currency
  availableCurrencies: string[]; // List of active currency codes
  taxSettings: {
    enableTax: boolean;
    taxRate: number;     // Default tax rate (percentage)
    taxIncluded: boolean; // Whether prices include tax
    taxByRegion: {       // Region-specific tax rates
      [regionCode: string]: number;
    };
  };
  createdAt?: any;
  updatedAt?: any;
} 