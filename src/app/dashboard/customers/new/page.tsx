'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { 
  RiArrowGoBackLine,
  RiUserLine,
  RiMailLine,
  RiSaveLine,
  RiMapPinLine,
  RiIdCardLine,
  RiSettingsLine,
  RiLockLine,
  RiShoppingCartLine,
  RiVipCrownLine,
  RiCustomerServiceLine,
  RiShareLine,
  RiShieldLine,
  RiNotificationLine,
  RiInformationLine
} from 'react-icons/ri';
import Link from 'next/link';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const userSchema = z.object({
  // Basic Information
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  role: z.enum(['admin', 'customer']),
  isActive: z.boolean(),
  photoURL: z.string().optional(),
  
  // Account Status
  accountStatus: z.enum(['active', 'suspended', 'deactivated']),
  accountType: z.enum(['regular', 'premium', 'enterprise']),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  
  // Contact Information
  addresses: z.array(z.object({
    id: z.string(),
    type: z.enum(['billing', 'shipping']),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    isDefault: z.boolean(),
    phoneNumber: z.string().optional(),
    label: z.string().optional()
  })).optional(),
  
  // Payment Information
  paymentMethods: z.array(z.object({
    id: z.string(),
    type: z.enum(['credit_card', 'paypal', 'bank_transfer', 'apple_pay', 'google_pay']),
    provider: z.string().optional(),
    lastFourDigits: z.string().optional(),
    expiryDate: z.string().optional(),
    isDefault: z.boolean(),
    billingAddressId: z.string().optional(),
    isVerified: z.boolean()
  })).optional(),
  
  // Preferences
  preferences: z.object({
    language: z.string(),
    currency: z.string(),
    timezone: z.string(),
    dateFormat: z.string(),
    marketingEmails: z.boolean(),
    orderNotifications: z.boolean(),
    newsletterSubscription: z.boolean(),
    priceAlerts: z.boolean(),
    stockNotifications: z.boolean(),
    reviewReminders: z.boolean(),
    abandonedCartReminders: z.boolean(),
    personalizedRecommendations: z.boolean(),
    socialMediaSharing: z.boolean()
  }),

  // Loyalty Program
  loyaltyStatus: z.enum(['inactive', 'active', 'suspended']),
  loyaltyTier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  loyaltyPoints: z.number(),
  loyaltyJoinDate: z.string(),
  loyaltyExpiryDate: z.string(),

  // Shopping Behavior
  orderCount: z.number(),
  totalSpent: z.number(),
  averageOrderValue: z.number(),
  lastOrderDate: z.string(),

  // Social & Referral
  referralCode: z.string().optional(),
  referredBy: z.string().optional(),
  referralCount: z.number(),
  referralEarnings: z.number(),

  // Security
  twoFactorEnabled: z.boolean(),
  failedLoginAttempts: z.number(),
  lastPasswordChange: z.string(),
  accountLockedUntil: z.string().optional(),

  // Notifications
  notificationPreferences: z.object({
    email: z.object({
      orderUpdates: z.boolean(),
      shippingUpdates: z.boolean(),
      promotions: z.boolean(),
      priceDrops: z.boolean(),
      backInStock: z.boolean(),
      reviews: z.boolean()
    }),
    sms: z.object({
      orderUpdates: z.boolean(),
      shippingUpdates: z.boolean(),
      promotions: z.boolean()
    }),
    push: z.object({
      orderUpdates: z.boolean(),
      promotions: z.boolean(),
      priceAlerts: z.boolean()
    })
  }),

  // Additional Information
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  occupation: z.string().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'sms']),
  preferredShippingMethod: z.string().optional(),
  preferredPaymentMethod: z.string().optional()
});

type UserFormData = z.infer<typeof userSchema>;

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'basic' | 'address' | 'payment' | 'preferences' | 
    'loyalty' | 'shopping' | 'support' | 'social' | 
    'security' | 'notifications' | 'additional'
  >('basic');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      displayName: '',
      email: '',
      role: 'customer',
      isActive: true,
      accountStatus: 'active',
      accountType: 'regular',
      emailVerified: false,
      phoneVerified: false,
      addresses: [],
      paymentMethods: [],
      preferences: {
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        marketingEmails: true,
        orderNotifications: true,
        newsletterSubscription: false,
        priceAlerts: true,
        stockNotifications: true,
        reviewReminders: true,
        abandonedCartReminders: true,
        personalizedRecommendations: true,
        socialMediaSharing: false
      },
      // Loyalty Program
      loyaltyStatus: 'inactive',
      loyaltyTier: 'bronze',
      loyaltyPoints: 0,
      loyaltyJoinDate: new Date().toISOString().split('T')[0],
      loyaltyExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Shopping Behavior
      orderCount: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      lastOrderDate: '',
      // Social & Referral
      referralCode: '',
      referredBy: '',
      referralCount: 0,
      referralEarnings: 0,
      // Security
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date().toISOString().split('T')[0],
      accountLockedUntil: '',
      // Notifications
      notificationPreferences: {
        email: {
          orderUpdates: true,
          shippingUpdates: true,
          promotions: true,
          priceDrops: true,
          backInStock: true,
          reviews: true
        },
        sms: {
          orderUpdates: true,
          shippingUpdates: true,
          promotions: true
        },
        push: {
          orderUpdates: true,
          promotions: true,
          priceAlerts: true
        }
      },
      // Additional Information
      dateOfBirth: '',
      gender: 'prefer_not_to_say' as const,
      occupation: '',
      companyName: '',
      taxId: '',
      vatNumber: '',
      preferredContactMethod: 'email',
      preferredShippingMethod: '',
      preferredPaymentMethod: ''
    }
  });

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const currenciesSnapshot = await getDocs(collection(db, 'currencies'));
        const currenciesData = currenciesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Currency[];
        
        // Filter active currencies and sort by default first
        const activeCurrencies = currenciesData
          .filter(currency => currency.isActive)
          .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        
        setCurrencies(activeCurrencies);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        toast({
          id: 'currency-fetch-error',
          title: "Error",
          description: "Failed to load currencies",
          variant: "destructive"
        });
      } finally {
        setLoadingCurrencies(false);
      }
    };

    fetchCurrencies();
  }, []);

  const onSubmit: SubmitHandler<UserFormData> = async (data) => {
    try {
      setSaving(true);
      const newUserRef = doc(collection(db, 'users'));
      
      await setDoc(newUserRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        id: 'create-success',
        title: "Success",
        description: "Customer created successfully",
        variant: "default"
      });

      router.push(`/dashboard/customers/${newUserRef.id}`);
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        id: 'create-error',
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">New Customer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new customer account
            </p>
          </div>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
          >
            <RiArrowGoBackLine className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-border">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveSection('basic')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'basic'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiUserLine className="mr-2 h-4 w-4" />
              Basic Info
            </button>
            <button
              onClick={() => setActiveSection('address')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'address'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiMapPinLine className="mr-2 h-4 w-4" />
              Address
            </button>
            <button
              onClick={() => setActiveSection('payment')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'payment'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiIdCardLine className="mr-2 h-4 w-4" />
              Payment
            </button>
            <button
              onClick={() => setActiveSection('preferences')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'preferences'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiSettingsLine className="mr-2 h-4 w-4" />
              Preferences
            </button>
            <button
              onClick={() => setActiveSection('loyalty')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'loyalty'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiVipCrownLine className="mr-2 h-4 w-4" />
              Loyalty
            </button>
            <button
              onClick={() => setActiveSection('shopping')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'shopping'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiShoppingCartLine className="mr-2 h-4 w-4" />
              Shopping
            </button>
            <button
              onClick={() => setActiveSection('support')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'support'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiCustomerServiceLine className="mr-2 h-4 w-4" />
              Support
            </button>
            <button
              onClick={() => setActiveSection('social')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'social'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiShareLine className="mr-2 h-4 w-4" />
              Social
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiShieldLine className="mr-2 h-4 w-4" />
              Security
            </button>
            <button
              onClick={() => setActiveSection('notifications')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiNotificationLine className="mr-2 h-4 w-4" />
              Notifications
            </button>
            <button
              onClick={() => setActiveSection('additional')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeSection === 'additional'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiInformationLine className="mr-2 h-4 w-4" />
              Additional
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow">
            {activeSection === 'basic' && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
                  
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                      Name
                    </label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <RiUserLine className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                          type="text"
                          id="displayName"
                          className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Customer name"
                          {...register('displayName')}
                        />
                      </div>
                      {errors.displayName && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.displayName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <div className="mt-1">
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <RiMailLine className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Customer email"
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground">
                      Phone Number
                    </label>
                    <div className="mt-1">
                      <input
                        type="tel"
                        id="phoneNumber"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Customer phone number"
                        {...register('phoneNumber')}
                      />
                      {errors.phoneNumber && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.phoneNumber.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-foreground">Account Settings</h2>
                  
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-foreground">
                      Role
                    </label>
                    <select
                      id="role"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('role')}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="accountStatus" className="block text-sm font-medium text-foreground">
                      Account Status
                    </label>
                    <select
                      id="accountStatus"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('accountStatus')}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="accountType" className="block text-sm font-medium text-foreground">
                      Account Type
                    </label>
                    <select
                      id="accountType"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('accountType')}
                    >
                      <option value="regular">Regular</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('isActive')}
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-foreground">
                      Account Active
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailVerified"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('emailVerified')}
                    />
                    <label htmlFor="emailVerified" className="ml-2 block text-sm text-foreground">
                      Email Verified
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="phoneVerified"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('phoneVerified')}
                    />
                    <label htmlFor="phoneVerified" className="ml-2 block text-sm text-foreground">
                      Phone Verified
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'address' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Address Information</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="addressType" className="block text-sm font-medium text-foreground">
                      Address Type
                    </label>
                    <select
                      id="addressType"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('addresses.0.type')}
                    >
                      <option value="billing">Billing Address</option>
                      <option value="shipping">Shipping Address</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="addressLabel" className="block text-sm font-medium text-foreground">
                      Address Label
                    </label>
                    <input
                      type="text"
                      id="addressLabel"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g., Home, Office"
                      {...register('addresses.0.label')}
                    />
                  </div>

                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-foreground">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="street"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Street address"
                      {...register('addresses.0.street')}
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-foreground">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="City"
                      {...register('addresses.0.city')}
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-foreground">
                      State/Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="State or province"
                      {...register('addresses.0.state')}
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-foreground">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Postal code"
                      {...register('addresses.0.postalCode')}
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-foreground">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Country"
                      {...register('addresses.0.country')}
                    />
                  </div>

                  <div>
                    <label htmlFor="addressPhone" className="block text-sm font-medium text-foreground">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      id="addressPhone"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Phone number for this address"
                      {...register('addresses.0.phoneNumber')}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefaultAddress"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('addresses.0.isDefault')}
                    />
                    <label htmlFor="isDefaultAddress" className="ml-2 block text-sm text-foreground">
                      Set as default address
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Payment Information</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="paymentType" className="block text-sm font-medium text-foreground">
                      Payment Method Type
                    </label>
                    <select
                      id="paymentType"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('paymentMethods.0.type')}
                    >
                      <option value="credit_card">Credit Card</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="apple_pay">Apple Pay</option>
                      <option value="google_pay">Google Pay</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="paymentProvider" className="block text-sm font-medium text-foreground">
                      Provider
                    </label>
                    <input
                      type="text"
                      id="paymentProvider"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g., Visa, Mastercard"
                      {...register('paymentMethods.0.provider')}
                    />
                  </div>

                  <div>
                    <label htmlFor="lastFourDigits" className="block text-sm font-medium text-foreground">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      id="lastFourDigits"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Last 4 digits of card"
                      {...register('paymentMethods.0.lastFourDigits')}
                    />
                  </div>

                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-foreground">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      id="expiryDate"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="MM/YY"
                      {...register('paymentMethods.0.expiryDate')}
                    />
                  </div>

                  <div>
                    <label htmlFor="billingAddress" className="block text-sm font-medium text-foreground">
                      Billing Address
                    </label>
                    <select
                      id="billingAddress"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('paymentMethods.0.billingAddressId')}
                    >
                      <option value="">Select billing address</option>
                      {/* This will be populated with addresses when they exist */}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefaultPayment"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('paymentMethods.0.isDefault')}
                    />
                    <label htmlFor="isDefaultPayment" className="ml-2 block text-sm text-foreground">
                      Set as default payment method
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isVerified"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('paymentMethods.0.isVerified')}
                    />
                    <label htmlFor="isVerified" className="ml-2 block text-sm text-foreground">
                      Payment method verified
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">User Preferences</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-foreground">
                      Language
                    </label>
                    <select
                      id="language"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('preferences.language')}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-foreground">
                      Currency
                    </label>
                    {loadingCurrencies ? (
                      <div className="mt-1 h-10 w-full animate-pulse rounded-md bg-muted" />
                    ) : (
                      <select
                        id="currency"
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        {...register('preferences.currency')}
                      >
                        {currencies.map((currency) => (
                          <option key={currency.id} value={currency.code}>
                            {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-foreground">
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('preferences.timezone')}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dateFormat" className="block text-sm font-medium text-foreground">
                      Date Format
                    </label>
                    <select
                      id="dateFormat"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('preferences.dateFormat')}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-4">
                    <h3 className="text-sm font-medium text-foreground">Communication Preferences</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="marketingEmails"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.marketingEmails')}
                        />
                        <label htmlFor="marketingEmails" className="ml-2 block text-sm text-foreground">
                          Marketing Emails
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="orderNotifications"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.orderNotifications')}
                        />
                        <label htmlFor="orderNotifications" className="ml-2 block text-sm text-foreground">
                          Order Notifications
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="newsletterSubscription"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.newsletterSubscription')}
                        />
                        <label htmlFor="newsletterSubscription" className="ml-2 block text-sm text-foreground">
                          Newsletter Subscription
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="priceAlerts"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.priceAlerts')}
                        />
                        <label htmlFor="priceAlerts" className="ml-2 block text-sm text-foreground">
                          Price Alerts
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="stockNotifications"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.stockNotifications')}
                        />
                        <label htmlFor="stockNotifications" className="ml-2 block text-sm text-foreground">
                          Stock Notifications
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="reviewReminders"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.reviewReminders')}
                        />
                        <label htmlFor="reviewReminders" className="ml-2 block text-sm text-foreground">
                          Review Reminders
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="abandonedCartReminders"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.abandonedCartReminders')}
                        />
                        <label htmlFor="abandonedCartReminders" className="ml-2 block text-sm text-foreground">
                          Abandoned Cart Reminders
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="personalizedRecommendations"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.personalizedRecommendations')}
                        />
                        <label htmlFor="personalizedRecommendations" className="ml-2 block text-sm text-foreground">
                          Personalized Recommendations
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="socialMediaSharing"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('preferences.socialMediaSharing')}
                        />
                        <label htmlFor="socialMediaSharing" className="ml-2 block text-sm text-foreground">
                          Social Media Sharing
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'loyalty' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Loyalty Program</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="loyaltyStatus" className="block text-sm font-medium text-foreground">
                      Loyalty Status
                    </label>
                    <select
                      id="loyaltyStatus"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('loyaltyStatus')}
                    >
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="loyaltyTier" className="block text-sm font-medium text-foreground">
                      Loyalty Tier
                    </label>
                    <select
                      id="loyaltyTier"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('loyaltyTier')}
                    >
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="loyaltyPoints" className="block text-sm font-medium text-foreground">
                      Loyalty Points
                    </label>
                    <input
                      type="number"
                      id="loyaltyPoints"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Enter loyalty points"
                      {...register('loyaltyPoints')}
                    />
                  </div>

                  <div>
                    <label htmlFor="loyaltyJoinDate" className="block text-sm font-medium text-foreground">
                      Join Date
                    </label>
                    <input
                      type="date"
                      id="loyaltyJoinDate"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('loyaltyJoinDate')}
                    />
                  </div>

                  <div>
                    <label htmlFor="loyaltyExpiryDate" className="block text-sm font-medium text-foreground">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      id="loyaltyExpiryDate"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('loyaltyExpiryDate')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'shopping' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Shopping Behavior</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="orderCount" className="block text-sm font-medium text-foreground">
                      Total Orders
                    </label>
                    <input
                      type="number"
                      id="orderCount"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Total number of orders"
                      {...register('orderCount')}
                    />
                  </div>

                  <div>
                    <label htmlFor="totalSpent" className="block text-sm font-medium text-foreground">
                      Total Spent
                    </label>
                    <input
                      type="number"
                      id="totalSpent"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Total amount spent"
                      {...register('totalSpent')}
                    />
                  </div>

                  <div>
                    <label htmlFor="averageOrderValue" className="block text-sm font-medium text-foreground">
                      Average Order Value
                    </label>
                    <input
                      type="number"
                      id="averageOrderValue"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Average order value"
                      {...register('averageOrderValue')}
                    />
                  </div>

                  <div>
                    <label htmlFor="lastOrderDate" className="block text-sm font-medium text-foreground">
                      Last Order Date
                    </label>
                    <input
                      type="date"
                      id="lastOrderDate"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('lastOrderDate')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'support' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Support History</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="supportTickets" className="block text-sm font-medium text-foreground">
                      Support Tickets
                    </label>
                    <div className="mt-1 rounded-md border border-input bg-background p-4">
                      <p className="text-sm text-muted-foreground">No support tickets yet</p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="refundHistory" className="block text-sm font-medium text-foreground">
                      Refund History
                    </label>
                    <div className="mt-1 rounded-md border border-input bg-background p-4">
                      <p className="text-sm text-muted-foreground">No refund history yet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'social' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Social & Referral</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="referralCode" className="block text-sm font-medium text-foreground">
                      Referral Code
                    </label>
                    <input
                      type="text"
                      id="referralCode"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Referral code"
                      {...register('referralCode')}
                    />
                  </div>

                  <div>
                    <label htmlFor="referredBy" className="block text-sm font-medium text-foreground">
                      Referred By
                    </label>
                    <input
                      type="text"
                      id="referredBy"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Referrer's code"
                      {...register('referredBy')}
                    />
                  </div>

                  <div>
                    <label htmlFor="referralCount" className="block text-sm font-medium text-foreground">
                      Referral Count
                    </label>
                    <input
                      type="number"
                      id="referralCount"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Number of referrals"
                      {...register('referralCount')}
                    />
                  </div>

                  <div>
                    <label htmlFor="referralEarnings" className="block text-sm font-medium text-foreground">
                      Referral Earnings
                    </label>
                    <input
                      type="number"
                      id="referralEarnings"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Total referral earnings"
                      {...register('referralEarnings')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="twoFactorEnabled"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      {...register('twoFactorEnabled')}
                    />
                    <label htmlFor="twoFactorEnabled" className="ml-2 block text-sm text-foreground">
                      Two-Factor Authentication
                    </label>
                  </div>

                  <div>
                    <label htmlFor="failedLoginAttempts" className="block text-sm font-medium text-foreground">
                      Failed Login Attempts
                    </label>
                    <input
                      type="number"
                      id="failedLoginAttempts"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Number of failed attempts"
                      {...register('failedLoginAttempts')}
                    />
                  </div>

                  <div>
                    <label htmlFor="lastPasswordChange" className="block text-sm font-medium text-foreground">
                      Last Password Change
                    </label>
                    <input
                      type="date"
                      id="lastPasswordChange"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('lastPasswordChange')}
                    />
                  </div>

                  <div>
                    <label htmlFor="accountLockedUntil" className="block text-sm font-medium text-foreground">
                      Account Locked Until
                    </label>
                    <input
                      type="datetime-local"
                      id="accountLockedUntil"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('accountLockedUntil')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Email Notifications</h3>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailOrderUpdates"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.orderUpdates')}
                        />
                        <label htmlFor="emailOrderUpdates" className="ml-2 block text-sm text-foreground">
                          Order Updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailShippingUpdates"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.shippingUpdates')}
                        />
                        <label htmlFor="emailShippingUpdates" className="ml-2 block text-sm text-foreground">
                          Shipping Updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailPromotions"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.promotions')}
                        />
                        <label htmlFor="emailPromotions" className="ml-2 block text-sm text-foreground">
                          Promotions
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailPriceDrops"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.priceDrops')}
                        />
                        <label htmlFor="emailPriceDrops" className="ml-2 block text-sm text-foreground">
                          Price Drops
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailBackInStock"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.backInStock')}
                        />
                        <label htmlFor="emailBackInStock" className="ml-2 block text-sm text-foreground">
                          Back in Stock Alerts
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailReviews"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.email.reviews')}
                        />
                        <label htmlFor="emailReviews" className="ml-2 block text-sm text-foreground">
                          Review Requests
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground">SMS Notifications</h3>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="smsOrderUpdates"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.sms.orderUpdates')}
                        />
                        <label htmlFor="smsOrderUpdates" className="ml-2 block text-sm text-foreground">
                          Order Updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="smsShippingUpdates"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.sms.shippingUpdates')}
                        />
                        <label htmlFor="smsShippingUpdates" className="ml-2 block text-sm text-foreground">
                          Shipping Updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="smsPromotions"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.sms.promotions')}
                        />
                        <label htmlFor="smsPromotions" className="ml-2 block text-sm text-foreground">
                          Promotions
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground">Push Notifications</h3>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="pushOrderUpdates"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.push.orderUpdates')}
                        />
                        <label htmlFor="pushOrderUpdates" className="ml-2 block text-sm text-foreground">
                          Order Updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="pushPromotions"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.push.promotions')}
                        />
                        <label htmlFor="pushPromotions" className="ml-2 block text-sm text-foreground">
                          Promotions
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="pushPriceAlerts"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('notificationPreferences.push.priceAlerts')}
                        />
                        <label htmlFor="pushPriceAlerts" className="ml-2 block text-sm text-foreground">
                          Price Alerts
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'additional' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Additional Information</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('dateOfBirth')}
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-foreground">
                      Gender
                    </label>
                    <select
                      id="gender"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('gender')}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-foreground">
                      Occupation
                    </label>
                    <input
                      type="text"
                      id="occupation"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Occupation"
                      {...register('occupation')}
                    />
                  </div>

                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Company name"
                      {...register('companyName')}
                    />
                  </div>

                  <div>
                    <label htmlFor="taxId" className="block text-sm font-medium text-foreground">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      id="taxId"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Tax identification number"
                      {...register('taxId')}
                    />
                  </div>

                  <div>
                    <label htmlFor="vatNumber" className="block text-sm font-medium text-foreground">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      id="vatNumber"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="VAT registration number"
                      {...register('vatNumber')}
                    />
                  </div>

                  <div>
                    <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-foreground">
                      Preferred Contact Method
                    </label>
                    <select
                      id="preferredContactMethod"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      {...register('preferredContactMethod')}
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="preferredShippingMethod" className="block text-sm font-medium text-foreground">
                      Preferred Shipping Method
                    </label>
                    <input
                      type="text"
                      id="preferredShippingMethod"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Preferred shipping method"
                      {...register('preferredShippingMethod')}
                    />
                  </div>

                  <div>
                    <label htmlFor="preferredPaymentMethod" className="block text-sm font-medium text-foreground">
                      Preferred Payment Method
                    </label>
                    <input
                      type="text"
                      id="preferredPaymentMethod"
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Preferred payment method"
                      {...register('preferredPaymentMethod')}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RiSaveLine className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 