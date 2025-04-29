'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Order } from '@/types';
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { 
  RiArrowGoBackLine,
  RiEditLine,
  RiUserLine,
  RiMailLine,
  RiCalendarLine,
  RiShoppingCartLine,
  RiVipCrownLine,
  RiVipDiamondLine,
  RiHistoryLine,
  RiMapPinLine,
  RiIdCardLine,
  RiHeartLine,
  RiSearchLine,
  RiSettingsLine,
  RiLockLine,
  RiAddLine
} from 'react-icons/ri';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { userData } = useAuth();
  const [customer, setCustomer] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'payment' | 'preferences'>('profile');

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCustomer({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
          toast({
            id: 'customer-not-found',
            title: "Error",
            description: "Customer not found",
            variant: "destructive"
          });
          router.push('/dashboard/customers');
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast({
          id: 'customer-fetch-error',
          title: "Error",
          description: "Failed to load customer data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, router]);

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Fetch customer data
      const customerDoc = await getDoc(doc(db, 'users', id as string));
      if (!customerDoc.exists()) {
        toast({
          id: 'customer-not-found',
          title: "Error",
          description: "Customer not found",
          variant: "destructive"
        });
        return;
      }
      setCustomer({ id: customerDoc.id, ...customerDoc.data() } as User);

      // Fetch customer's orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('customerId', '==', id),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        id: 'fetch-error',
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerSegment = (orderCount: number = 0) => {
    if (orderCount >= 10) return 'VIP';
    if (orderCount >= 3) return 'Regular';
    return 'New';
  };

  const getSegmentIcon = (orderCount: number = 0) => {
    if (orderCount >= 10) return <RiVipDiamondLine className="h-5 w-5 text-purple-500" />;
    if (orderCount >= 3) return <RiVipCrownLine className="h-5 w-5 text-blue-500" />;
    return <RiUserLine className="h-5 w-5 text-gray-500" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 bg-muted rounded"></div>
            <div className="h-4 w-1/2 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Customer Not Found</h1>
            <p className="mt-2 text-muted-foreground">The customer you're looking for doesn't exist.</p>
            <Link
              href="/dashboard/customers"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <RiArrowGoBackLine className="mr-2 h-4 w-4" />
              Back to Customers
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{customer.displayName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer ID: {customer.id}
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
              onClick={() => setActiveTab('profile')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiUserLine className="mr-2 h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiShoppingCartLine className="mr-2 h-4 w-4" />
              Orders
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'addresses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiMapPinLine className="mr-2 h-4 w-4" />
              Addresses
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'payment'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiIdCardLine className="mr-2 h-4 w-4" />
              Payment
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'preferences'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground'
              }`}
            >
              <RiSettingsLine className="mr-2 h-4 w-4" />
              Preferences
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-border bg-card p-6 shadow">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                      <dd className="mt-1 text-sm text-foreground">{customer.displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                      <dd className="mt-1 text-sm text-foreground">{customer.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                      <dd className="mt-1 text-sm text-foreground">{customer.phoneNumber || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                      <dd className="mt-1 text-sm text-foreground capitalize">{customer.role}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          customer.accountStatus === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            : customer.accountStatus === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {customer.accountStatus}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground">Account Details</h2>
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
                      <dd className="mt-1 text-sm text-foreground capitalize">{customer.accountType}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Email Verified</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          customer.emailVerified
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {customer.emailVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Phone Verified</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          customer.phoneVerified
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {customer.phoneVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDate(customer.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {formatDate(customer.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
              {customer.orderCount > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            Order #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format(order.createdAt.toDate(), 'MMMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              : order.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • Total: ${order.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No orders found</p>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Addresses</h2>
              {customer.addresses && customer.addresses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {customer.addresses.map((address) => (
                    <div key={address.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{address.label || 'Address'}</h3>
                          <p className="mt-1 text-sm text-muted-foreground capitalize">{address.type}</p>
                        </div>
                        {address.isDefault && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-1 text-sm text-foreground">
                        <p>{address.street}</p>
                        <p>{address.city}, {address.state} {address.postalCode}</p>
                        <p>{address.country}</p>
                        {address.phoneNumber && (
                          <p className="mt-2 text-muted-foreground">Phone: {address.phoneNumber}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No addresses found</p>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Payment Methods</h2>
              {customer.paymentMethods && customer.paymentMethods.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {customer.paymentMethods.map((method) => (
                    <div key={method.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground capitalize">{method.type.replace('_', ' ')}</h3>
                          {method.provider && (
                            <p className="mt-1 text-sm text-muted-foreground">{method.provider}</p>
                          )}
                        </div>
                        {method.isDefault && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-1 text-sm text-foreground">
                        {method.lastFourDigits && (
                          <p>•••• {method.lastFourDigits}</p>
                        )}
                        {method.expiryDate && (
                          <p>Expires: {method.expiryDate}</p>
                        )}
                        <div className="mt-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            method.isVerified
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                          }`}>
                            {method.isVerified ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payment methods found</p>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Language & Region</h3>
                  <dl className="mt-4 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Language</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {customer?.preferences?.language || 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Currency</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {customer?.preferences?.currency || 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Timezone</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {customer?.preferences?.timezone || 'Not set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Date Format</dt>
                      <dd className="mt-1 text-sm text-foreground">
                        {customer?.preferences?.dateFormat || 'Not set'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground">Communication Preferences</h3>
                  <dl className="mt-4 space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.marketingEmails || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Marketing Emails</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.orderNotifications || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Order Notifications</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.newsletterSubscription || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Newsletter Subscription</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.priceAlerts || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Price Alerts</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.stockNotifications || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Stock Notifications</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.reviewReminders || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Review Reminders</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.abandonedCartReminders || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Abandoned Cart Reminders</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.personalizedRecommendations || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Personalized Recommendations</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={customer?.preferences?.socialMediaSharing || false}
                        readOnly
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <label className="ml-2 text-sm text-foreground">Social Media Sharing</label>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 