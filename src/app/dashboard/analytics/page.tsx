'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiShoppingBagLine,
  RiPercentLine,
  RiDownloadLine,
  RiCalendarLine
} from 'react-icons/ri';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  averageOrder: number;
}

interface ProductData {
  name: string;
  sales: number;
  revenue: number;
}

interface PromotionData {
  name: string;
  revenue: number;
  orders: number;
  conversion: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductData[]>([]);
  const [promotionData, setPromotionData] = useState<PromotionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch orders within date range
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('createdAt', '>=', Timestamp.fromDate(dateRange.from!)),
          where('createdAt', '<=', Timestamp.fromDate(dateRange.to!)),
          orderBy('createdAt', 'asc')
        );

        const ordersSnapshot = await getDocs(q);
        const orders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));

        // Process sales data
        const salesByDate = orders.reduce((acc: { [key: string]: SalesData }, order: any) => {
          const date = format(order.createdAt, 'yyyy-MM');
          if (!acc[date]) {
            acc[date] = {
              date,
              revenue: 0,
              orders: 0,
              averageOrder: 0
            };
          }
          acc[date].revenue += order.totalAmount || 0;
          acc[date].orders += 1;
          acc[date].averageOrder = acc[date].revenue / acc[date].orders;
          return acc;
        }, {});

        setSalesData(Object.values(salesByDate));

        // Process top products
        const productsMap = new Map<string, ProductData>();
        orders.forEach((order: any) => {
          order.items?.forEach((item: any) => {
            if (!productsMap.has(item.productId)) {
              productsMap.set(item.productId, {
                name: item.productName,
                sales: 0,
                revenue: 0
              });
            }
            const product = productsMap.get(item.productId)!;
            product.sales += item.quantity;
            product.revenue += item.price * item.quantity;
          });
        });

        setTopProducts(Array.from(productsMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5));

        // Process promotion data
        const promotionsMap = new Map<string, PromotionData>();
        orders.forEach((order: any) => {
          if (order.promotionCode) {
            if (!promotionsMap.has(order.promotionCode)) {
              promotionsMap.set(order.promotionCode, {
                name: order.promotionCode,
                revenue: 0,
                orders: 0,
                conversion: 0
              });
            }
            const promotion = promotionsMap.get(order.promotionCode)!;
            promotion.revenue += order.totalAmount || 0;
            promotion.orders += 1;
            // Calculate conversion rate (this would need actual promotion view data)
            promotion.conversion = (promotion.orders / orders.length) * 100;
          }
        });

        setPromotionData(Array.from(promotionsMap.values()));

      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (dateRange.from && dateRange.to) {
      fetchAnalyticsData();
    }
  }, [dateRange]);

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting data...');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
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
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <div className="flex items-center gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            <Button onClick={handleExport} variant="outline">
              <RiDownloadLine className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <RiMoneyDollarCircleLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${salesData.reduce((sum, data) => sum + data.revenue, 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <RiShoppingBagLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData.reduce((sum, data) => sum + data.orders, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <RiLineChartLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(salesData.reduce((sum, data) => sum + data.revenue, 0) / 
                   salesData.reduce((sum, data) => sum + data.orders, 0) || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <RiPercentLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((promotionData.reduce((sum, data) => sum + data.conversion, 0) / 
                   promotionData.length) || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange.from && dateRange.to && 
                  `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Promotion Effectiveness */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Promotion Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={promotionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    label={({ name, percent }: { name: string; percent: number }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {promotionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 