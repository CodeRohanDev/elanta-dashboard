'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Order, OrderStatus, OrderHistory } from '@/types';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { 
  RiArrowGoBackLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiTruckLine,
  RiPagesLine,
  RiCloseCircleLine,
  RiTimeLine,
  RiUserLine,
  RiMapPinLine,
  RiIdCardLine,
  RiHistoryLine
} from 'react-icons/ri';
import Link from 'next/link';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { userData } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
    fetchOrderHistory();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const orderDoc = await getDoc(doc(db, 'orders', id as string));
      
      if (!orderDoc.exists()) {
        toast({
          id: 'order-not-found',
          title: "Error",
          description: "Order not found",
          variant: "destructive"
        });
        return;
      }

      setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        id: 'fetch-error',
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      const q = query(
        collection(db, 'orderHistory'),
        where('orderId', '==', id),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrderHistory[];

      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order || !userData) return;

    try {
      setUpdating(true);
      
      // Update order status
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Add to order history
      await addDoc(collection(db, 'orderHistory'), {
        orderId: order.id,
        status: newStatus,
        notes: `Status updated to ${newStatus}`,
        createdAt: new Date().toISOString(),
        updatedBy: userData.id
      });

      // Refresh data
      await fetchOrder();
      await fetchOrderHistory();

      toast({
        id: 'status-updated',
        title: "Success",
        description: "Order status updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        id: 'update-error',
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <RiErrorWarningLine className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <RiPagesLine className="h-5 w-5 text-blue-500" />;
      case 'shipped':
        return <RiTruckLine className="h-5 w-5 text-purple-500" />;
      case 'delivered':
        return <RiCheckboxCircleLine className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <RiCloseCircleLine className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Order not found</h2>
            <Link
              href="/dashboard/orders"
              className="mt-4 inline-flex items-center text-primary hover:text-primary/90"
            >
              <RiArrowGoBackLine className="mr-2 h-5 w-5" />
              Back to Orders
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
            <h1 className="text-2xl font-bold text-foreground">Order Details</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order ID: {order.id}
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
          >
            <RiArrowGoBackLine className="mr-2 h-4 w-4" />
            Back to Orders
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Order Summary</h2>
              
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{order.status}</span>
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">Items</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="mr-3 h-12 w-12 rounded-md object-cover"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-medium text-foreground">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">Shipping</span>
                  <span className="text-sm font-medium text-foreground">$0.00</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">Tax</span>
                  <span className="text-sm font-medium text-foreground">$0.00</span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-2">
                  <span className="text-base font-semibold text-foreground">Total</span>
                  <span className="text-base font-semibold text-foreground">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="rounded-lg border border-border bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Customer Information</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <RiUserLine className="mr-2 mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {order.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <RiMapPinLine className="mr-2 mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {order.shippingAddress.street}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.shippingAddress.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <RiIdCardLine className="mr-2 mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Payment Method
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.paymentMethod}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {order.paymentStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="rounded-lg border border-border bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Update Status</h2>
              <div className="space-y-2">
                {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(status)}
                    disabled={updating || order.status === status}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                      order.status === status
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    <span className="flex items-center">
                      {getStatusIcon(status)}
                      <span className="ml-2 capitalize">{status}</span>
                    </span>
                    {order.status === status && (
                      <RiCheckboxCircleLine className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Order History */}
            <div className="rounded-lg border border-border bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Order History</h2>
              <div className="space-y-4">
                {history.map((record) => (
                  <div key={record.id} className="flex items-start">
                    <RiHistoryLine className="mr-2 mt-1 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Status changed to {record.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                      </p>
                      {record.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 