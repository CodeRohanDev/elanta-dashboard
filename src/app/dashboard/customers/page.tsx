'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User } from '@/types';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { 
  RiSearchLine, 
  RiFilterLine, 
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
  RiUserLine,
  RiVipCrownLine,
  RiVipDiamondLine,
  RiVipCrown2Line
} from 'react-icons/ri';
import Link from 'next/link';
import { format } from 'date-fns';

type CustomerSegment = 'all' | 'vip' | 'regular' | 'new';

export default function CustomersPage() {
  const { userData } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<CustomerSegment>('all');

  useEffect(() => {
    fetchCustomers();
  }, [segmentFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

      if (segmentFilter !== 'all') {
        q = query(q, where('role', '==', 'customer'));
      }

      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        id: 'fetch-customers-error',
        title: "Error",
        description: "Failed to fetch customers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.displayName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSegment = segmentFilter === 'all' || 
      (segmentFilter === 'vip' && (customer.orderCount || 0) >= 10) ||
      (segmentFilter === 'regular' && (customer.orderCount || 0) >= 3) ||
      (segmentFilter === 'new' && (customer.orderCount || 0) < 3);

    return matchesSearch && matchesSegment;
  });

  const getCustomerSegment = (orderCount: number = 0) => {
    if (orderCount >= 10) return 'VIP';
    if (orderCount >= 3) return 'Regular';
    return 'New';
  };

  const getSegmentIcon = (orderCount: number = 0) => {
    if (orderCount >= 10) return <RiVipDiamondLine className="h-4 w-4 text-purple-500" />;
    if (orderCount >= 3) return <RiVipCrownLine className="h-4 w-4 text-blue-500" />;
    return <RiUserLine className="h-4 w-4 text-gray-500" />;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <Link
            href="/dashboard/customers/new"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Add New Customer
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiSearchLine className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search customers..."
              className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value as CustomerSegment)}
          >
            <option value="all">All Customers</option>
            <option value="vip">VIP Customers</option>
            <option value="regular">Regular Customers</option>
            <option value="new">New Customers</option>
          </select>
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    Segment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">
                    Member Since
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {customer.photoURL ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={customer.photoURL}
                                alt={customer.displayName || 'Customer'}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <RiUserLine className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              {customer.displayName || 'Anonymous'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {customer.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                          {getSegmentIcon(customer.orderCount)}
                          <span className="ml-1">{getCustomerSegment(customer.orderCount)}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {customer.orderCount || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                        {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
                          >
                            <RiEyeLine className="h-4 w-4" />
                            <span className="ml-1">View</span>
                          </Link>
                          <Link
                            href={`/dashboard/customers/${customer.id}/edit`}
                            className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
                          >
                            <RiEditLine className="h-4 w-4" />
                            <span className="ml-1">Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 