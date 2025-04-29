'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Dashboard as DashboardData, Product } from '@/types';
import { 
  RiShoppingBag3Line, 
  RiFileList3Line, 
  RiMoneyDollarCircleLine, 
  RiArrowUpLine, 
  RiArrowDownLine,
  RiUser3Line
} from 'react-icons/ri';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Lazy load the low stock alerts component
const LowStockAlerts = lazy(() => import('@/components/ui/LowStockAlerts'));

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function Dashboard() {
  const { userData } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    recentOrders: [],
    salesByDay: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!userData) return;

      try {
        // Query for all orders and products without vendor filtering
        const ordersQuery = query(
            collection(db, 'orders'),
            orderBy('createdAt', 'desc')
          );

        const productsQuery = query(
          collection(db, 'products')
          );

        // Execute queries
        const [ordersSnapshot, productsSnapshot] = await Promise.all([
          getDocs(ordersQuery),
          getDocs(productsQuery)
        ]);

        // Process orders data
        const orders = ordersSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Order[];
        
        const recentOrders = orders.slice(0, 5);
        const totalOrders = orders.length;
        const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
        
        // Process products data
        const totalProducts = productsSnapshot.size;

        // Calculate sales by day for the chart (last 7 days)
        const salesByDay = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          // Format the date as YYYY-MM-DD for comparison
          const formattedDate = format(date, 'yyyy-MM-dd');
          
          // Sum orders for this day
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return format(orderDate, 'yyyy-MM-dd') === formattedDate;
          });
          
          const dayTotal = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          
          salesByDay.push({
            date: format(date, 'MMM dd'),
            amount: dayTotal
          });
        }

        setDashboardData({
          totalSales,
          totalOrders,
          totalProducts,
          recentOrders,
          salesByDay,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [userData]);

  // Chart configuration
  const chartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `$${context.parsed.y.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          borderDash: [2, 4],
        },
      },
    },
  };

  const chartData = {
    labels: dashboardData.salesByDay.map(day => day.date),
    datasets: [
      {
        fill: true,
        label: 'Sales',
        data: dashboardData.salesByDay.map(day => day.amount),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const stats = [
    {
      name: 'Total Sales',
      value: `$${dashboardData.totalSales.toFixed(2)}`,
      icon: RiMoneyDollarCircleLine,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Total Orders',
      value: dashboardData.totalOrders,
      icon: RiFileList3Line,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Total Products',
      value: dashboardData.totalProducts,
      icon: RiShoppingBag3Line,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
    let colorClass = '';
    
    switch (status) {
      case 'pending':
        colorClass = 'bg-amber-100/50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300';
        break;
      case 'processing':
        colorClass = 'bg-blue-100/50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300';
        break;
      case 'shipped':
        colorClass = 'bg-purple-100/50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300';
        break;
      case 'delivered':
        colorClass = 'bg-green-100/50 dark:bg-green-950/50 text-green-800 dark:text-green-300';
        break;
      case 'cancelled':
        colorClass = 'bg-red-100/50 dark:bg-red-950/50 text-red-800 dark:text-red-300';
        break;
      default:
        colorClass = 'bg-secondary text-muted-foreground';
    }
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Simple loading placeholder for lazy-loaded components
  function LoadingPlaceholder() {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow">
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.name} className="overflow-hidden rounded-lg bg-card shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dt className="truncate text-sm font-medium text-muted-foreground">{stat.name}</dt>
                    <dd className="mt-1 text-3xl font-semibold text-card-foreground">{stat.value}</dd>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Dashboard Layout - Two Columns for larger screens */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
        {/* Sales Chart */}
        <div className="overflow-hidden rounded-lg bg-card shadow">
          <div className="p-5">
            <h2 className="text-lg font-medium text-card-foreground">Sales Overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Last 7 days</p>
            <div className="mt-6 h-72">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">Loading chart data...</p>
                </div>
              ) : (
                <Line options={chartOptions} data={chartData} />
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Orders */}
        <div className="overflow-hidden rounded-lg bg-card shadow">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-card-foreground">Recent Orders</h2>
              <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:text-primary/90">
                View all
              </Link>
            </div>
          </div>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  ) : dashboardData.recentOrders.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">No orders yet.</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-card-foreground sm:pl-0">
                            Order ID
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-card-foreground">
                            Customer
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-card-foreground">
                            Status
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-card-foreground">
                            Date
                          </th>
                          <th className="px-3 py-3.5 text-right text-sm font-semibold text-card-foreground">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dashboardData.recentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-secondary/50">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary sm:pl-0">
                              <Link href={`/dashboard/orders/${order.id}`}>
                                #{order.id.slice(0, 8)}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                              {order.customerId.slice(0, 6)}...
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-card-foreground">
                              ${order.totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Low Stock Alerts */}
            <Suspense fallback={<LoadingPlaceholder />}>
              <LowStockAlerts />
            </Suspense>
            
            {/* Additional widgets can be added here */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 