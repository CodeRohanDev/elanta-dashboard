'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RiPieChartLine, RiLineChartLine, RiCalendarLine } from 'react-icons/ri';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

  useEffect(() => {
    // Redirect if not vendor
    if (userData && userData.role !== 'vendor') {
      router.push('/dashboard');
      return;
    }

    async function fetchAnalyticsData() {
      if (!userData?.id) return;

      try {
        // Fetch sales data
        const salesQuery = query(
          collection(db, 'orders'),
          where('vendorId', '==', userData.id),
          orderBy('createdAt', 'desc')
        );
        const salesSnapshot = await getDocs(salesQuery);
        const salesData = salesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSalesData(salesData);

        // Fetch product data
        const productsQuery = query(
          collection(db, 'products'),
          where('vendorId', '==', userData.id)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProductData(productsData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userData?.role === 'vendor') {
      fetchAnalyticsData();
    }
  }, [userData, router]);

  // Process data for charts
  const processChartData = () => {
    // Sample data for demo purposes
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const revenueData = {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: [1200, 1900, 1500, 2500, 2200, 3000, 2800],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };

    const ordersData = {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: [12, 19, 15, 25, 22, 30, 28],
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
        },
      ],
    };

    const productShareData = {
      labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Others'],
      datasets: [
        {
          data: [30, 25, 20, 15, 10],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
          borderWidth: 1,
        },
      ],
    };

    return { revenueData, ordersData, productShareData };
  };

  const { revenueData, ordersData, productShareData } = processChartData();

  if (userData && userData.role !== 'vendor') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          
          <div className="flex items-center space-x-2 bg-white rounded-md shadow p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                period === 'week' ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                period === 'month' ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                period === 'year' ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
              }`}
            >
              Year
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Revenue</h2>
                <RiLineChartLine className="h-5 w-5 text-gray-500" />
              </div>
              <div className="h-64">
                <Line
                  data={revenueData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Orders Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Orders</h2>
                <RiCalendarLine className="h-5 w-5 text-gray-500" />
              </div>
              <div className="h-64">
                <Bar
                  data={ordersData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Product Share */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Product Share</h2>
                <RiPieChartLine className="h-5 w-5 text-gray-500" />
              </div>
              <div className="h-64 flex items-center justify-center">
                <div style={{ width: '80%', height: '80%' }}>
                  <Doughnut
                    data={productShareData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Top Products</h2>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sales
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <tr key={item}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          Product {String.fromCharCode(64 + item)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(Math.random() * 50) + 10}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                          ${(Math.random() * 1000 + 500).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 