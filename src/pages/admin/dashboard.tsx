import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaUsers,
  FaCreditCard,
  FaShoppingCart,
  FaChartLine,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaCalendarAlt
} from "react-icons/fa";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
} from "recharts";
import FormattedPrice from "@/components/FormattedPrice";

interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
    averageOrderValue: number;
    monthlyGrowth: number;
  };
  cardholders: {
    total: number;
    active: number;
    online: number;
    totalCards: number;
    newThisMonth: number;
  };
  paymentRequests: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    totalDiscountGiven: number;
    totalCommissionEarned: number;
    acceptanceRate: number;
  };
  categories: {
    name: string;
    sales: number;
    orders: number;
  }[];
}

interface ChartData {
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  paymentRequestTrends: { date: string; requests: number; accepted: number }[];
  categoryDistribution: { category: string; value: number }[];
  hourlyActivity: { hour: string; requests: number }[];
}

interface RecentActivity {
  type: 'order' | 'payment_request' | 'cardholder';
  message: string;
  timestamp: Date;
  amount?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AdminDashboard = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !session.user.isAdmin) {
      router.push('/');
      return;
    }
    
    fetchDashboardData();
  }, [session, status, dateRange]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchDashboardData(true);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loading]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Fetch stats
      const statsResponse = await fetch(`/api/admin/stats?range=${dateRange}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch chart data
      const chartResponse = await fetch(`/api/admin/charts?range=${dateRange}`);
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        setChartData(chartData);
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/admin/activity');
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/export?range=${dateRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `admin-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor platform performance and analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
              </select>
              <button
                onClick={() => fetchDashboardData(true)}
                className={`p-2 rounded-md hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}
              >
                🔄
              </button>
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 bg-amazon_blue text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <FaDownload />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-full">
                <FaMoneyBillWave className="text-green-600 text-xl" />
              </div>
              {stats?.orders.monthlyGrowth && (
                <div className={`flex items-center text-sm ${stats.orders.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.orders.monthlyGrowth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                  <span className="ml-1">{Math.abs(stats.orders.monthlyGrowth)}%</span>
                </div>
              )}
            </div>
            <h3 className="text-gray-600 text-sm">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-800">
              <FormattedPrice amount={stats?.orders.totalRevenue || 0} />
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg. Order: <FormattedPrice amount={stats?.orders.averageOrderValue || 0} />
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaShoppingCart className="text-blue-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">All time</span>
            </div>
            <h3 className="text-gray-600 text-sm">Total Orders</h3>
            <p className="text-2xl font-bold text-gray-800">{stats?.orders.total || 0}</p>
            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center">
                <FaCheckCircle className="text-green-500 mr-1" />
                {stats?.orders.completed || 0}
              </span>
              <span className="flex items-center">
                <FaClock className="text-yellow-500 mr-1" />
                {stats?.orders.pending || 0}
              </span>
            </div>
          </div>

          {/* Active Cardholders */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaUsers className="text-purple-600 text-xl" />
              </div>
              <span className="text-sm text-green-600">
                {stats?.cardholders.online || 0} online
              </span>
            </div>
            <h3 className="text-gray-600 text-sm">Active Cardholders</h3>
            <p className="text-2xl font-bold text-gray-800">{stats?.cardholders.active || 0}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.cardholders.totalCards || 0} cards • +{stats?.cardholders.newThisMonth || 0} this month
            </p>
          </div>

          {/* Commission Earned */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaCreditCard className="text-yellow-600 text-xl" />
              </div>
              <span className="text-sm text-gray-500">
                {stats?.paymentRequests.acceptanceRate || 0}% rate
              </span>
            </div>
            <h3 className="text-gray-600 text-sm">Total Commission</h3>
            <p className="text-2xl font-bold text-gray-800">
              <FormattedPrice amount={stats?.paymentRequests.totalCommissionEarned || 0} />
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Discount given: <FormattedPrice amount={stats?.paymentRequests.totalDiscountGiven || 0} />
            </p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData?.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Requests Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Requests</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData?.paymentRequestTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#8884d8" 
                  name="Total Requests"
                />
                <Line 
                  type="monotone" 
                  dataKey="accepted" 
                  stroke="#82ca9d" 
                  name="Accepted"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(chartData?.categoryDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Activity by Hour</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData?.hourlyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Categories Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Categories</h3>
            <div className="space-y-3">
              {stats?.categories.slice(0, 5).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                    <span className="text-sm capitalize">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      <FormattedPrice amount={category.sales} />
                    </p>
                    <p className="text-xs text-gray-500">{category.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'order' ? 'bg-blue-100' :
                    activity.type === 'payment_request' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    {activity.type === 'order' && <FaShoppingCart className="text-blue-600 text-sm" />}
                    {activity.type === 'payment_request' && <FaCreditCard className="text-green-600 text-sm" />}
                    {activity.type === 'cardholder' && <FaUsers className="text-purple-600 text-sm" />}
                  </div>
                  <div>
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {activity.amount && (
                  <span className="text-sm font-semibold">
                    <FormattedPrice amount={activity.amount} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/orders" className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Manage Orders</h4>
                  <p className="text-sm text-gray-600">View and update order status</p>
                </div>
                <FaShoppingCart className="text-2xl text-gray-400" />
              </div>
          </Link>
          
          <Link href="/admin/cardholders" className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Manage Cardholders</h4>
                  <p className="text-sm text-gray-600">Monitor cardholder activity</p>
                </div>
                <FaUsers className="text-2xl text-gray-400" />
              </div>
          </Link>
          
          <Link href="/admin/payments" className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Payment Requests</h4>
                  <p className="text-sm text-gray-600">Track payment request flow</p>
                </div>
                <FaCreditCard className="text-2xl text-gray-400" />
              </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;