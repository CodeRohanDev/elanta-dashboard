'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RiTruckLine,
  RiPrinterLine,
  RiSearchLine,
  RiNotificationLine,
  RiRefreshLine
} from 'react-icons/ri';
import { collection, query, where, getDocs, orderBy, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface ShippingOrder {
  id: string;
  orderId: string;
  customerName: string;
  shippingAddress: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  items: {
    name: string;
    quantity: number;
  }[];
}

export default function ShippingDashboard() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ShippingOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', 'in', ['pending', 'processing', 'shipped']),
        orderBy('createdAt', 'desc')
      );

      const ordersSnapshot = await getDocs(q);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as ShippingOrder[];

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabel = async (order: ShippingOrder) => {
    try {
      // Here you would integrate with your shipping API
      // For example: UPS, FedEx, or DHL
      const shippingResponse = await fetch('/api/shipping/generate-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          address: order.shippingAddress,
          items: order.items,
        }),
      });

      if (!shippingResponse.ok) {
        throw new Error('Failed to generate shipping label');
      }

      const { trackingNumber, carrier, estimatedDelivery } = await shippingResponse.json();

      // Update order in Firestore
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'processing',
        trackingNumber,
        carrier,
        estimatedDelivery: Timestamp.fromDate(new Date(estimatedDelivery)),
      });

      toast.success('Shipping label generated successfully');
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error('Error generating shipping label:', error);
      toast.error('Failed to generate shipping label');
    }
  };

  const handleTrackPackage = async (order: ShippingOrder) => {
    if (!order.trackingNumber) {
      toast.error('No tracking number available');
      return;
    }

    try {
      // Here you would integrate with your shipping carrier's tracking API
      const trackingResponse = await fetch(`/api/shipping/track/${order.trackingNumber}`);
      
      if (!trackingResponse.ok) {
        throw new Error('Failed to fetch tracking information');
      }

      const trackingInfo = await trackingResponse.json();
      setSelectedOrder({ ...order, ...trackingInfo });
    } catch (error) {
      console.error('Error tracking package:', error);
      toast.error('Failed to fetch tracking information');
    }
  };

  const handleSendNotification = async (order: ShippingOrder) => {
    try {
      // Here you would integrate with your notification service
      const notificationResponse = await fetch('/api/notifications/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: order.customerName, // This should be the actual email
          trackingNumber: order.trackingNumber,
          status: order.status,
        }),
      });

      if (!notificationResponse.ok) {
        throw new Error('Failed to send notification');
      }

      toast.success('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const filteredOrders = orders.filter(order => 
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading shipping data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Shipping & Fulfillment</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 pr-4 py-2 border rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={fetchOrders} variant="outline">
              <RiRefreshLine className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Shipments</CardTitle>
              <RiTruckLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for processing
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <RiTruckLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'shipped').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently being delivered
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
              <RiTruckLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => 
                  o.status === 'delivered' && 
                  format(o.createdAt, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Order ID</th>
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Tracking</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 px-4">{order.orderId}</td>
                      <td className="py-3 px-4">{order.customerName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.trackingNumber ? (
                          <span className="text-sm">{order.trackingNumber}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not generated</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {!order.trackingNumber && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateLabel(order)}
                            >
                              <RiPrinterLine className="h-4 w-4" />
                            </Button>
                          )}
                          {order.trackingNumber && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTrackPackage(order)}
                              >
                                <RiSearchLine className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendNotification(order)}
                              >
                                <RiNotificationLine className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Order Details</h3>
                    <p>Order ID: {selectedOrder.orderId}</p>
                    <p>Customer: {selectedOrder.customerName}</p>
                    <p>Status: {selectedOrder.status}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Shipping Information</h3>
                    <p>Tracking Number: {selectedOrder.trackingNumber}</p>
                    <p>Carrier: {selectedOrder.carrier}</p>
                    <p>Estimated Delivery: {selectedOrder.estimatedDelivery ? format(selectedOrder.estimatedDelivery, 'PPP') : 'Not available'}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setSelectedOrder(null)}>Close</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 