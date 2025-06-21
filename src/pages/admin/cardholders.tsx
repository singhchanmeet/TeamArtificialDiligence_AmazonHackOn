import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  FaUsers,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaMoneyBillWave,
  FaArrowLeft,
  FaDownload,
  FaSync
} from "react-icons/fa";
import FormattedPrice from "@/components/FormattedPrice";

interface Card {
  id: string;
  lastFourDigits: string;
  cardType: string;
  bankName: string;
  categories: string[];
  discountPercentage: number;
  monthlyLimit: number;
  currentMonthSpent: number;
  isActive: boolean;
}

interface Cardholder {
  _id: string;
  userId: string;
  name: string;
  cards: Card[];
  isOnline: boolean;
  lastActiveAt: string;
  earnings: {
    total: number;
    thisMonth: number;
    pending: number;
  };
  registeredAt: string;
  updatedAt: string;
}

interface CardholdersData {
  cardholders: Cardholder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats: {
    total: number;
    online: number;
    active: number;
    totalCards: number;
  };
}

const AdminCardholders = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cardholdersData, setCardholdersData] = useState<CardholdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCardholder, setSelectedCardholder] = useState<Cardholder | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || !session.user.isAdmin) {
      router.push('/');
      return;
    }
    
    fetchCardholders();
  }, [session, status, currentPage, searchTerm, statusFilter]);

  // Auto refresh every 30 seconds for real-time updates
  useEffect(() => {
    if (!loading && session?.user?.isAdmin) {
      const interval = setInterval(() => {
        fetchCardholders(true); // Silent refresh
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [loading, session]);

  const fetchCardholders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchTerm,
        status: statusFilter
      });

      console.log('Fetching cardholders with params:', params.toString());
      const response = await fetch(`/api/admin/cardholders?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Cardholders data received:', data);
        setCardholdersData(data);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        setError(errorData.message || `HTTP ${response.status}: Failed to fetch cardholders`);
      }
    } catch (error) {
      console.error('Error fetching cardholders:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCardholders();
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleManualRefresh = () => {
    fetchCardholders();
  };

  const viewCardholderDetails = (cardholder: Cardholder) => {
    setSelectedCardholder(cardholder);
    setShowDetails(true);
  };

  const exportCardholders = async () => {
    try {
      const response = await fetch('/api/admin/export-cardholders');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `cardholders-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting cardholders:', error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amazon_blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cardholders...</p>
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
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-800">
                <FaArrowLeft className="text-xl" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Manage Cardholders</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor and manage cardholder accounts
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className={`p-2 rounded-md hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh data"
              >
                <FaSync className="text-gray-600" />
              </button>
              <button
                onClick={exportCardholders}
                className="flex items-center space-x-2 bg-amazon_blue text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                <FaDownload />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FaTimesCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaUsers className="text-blue-600 text-xl" />
              </div>
              {refreshing && <FaSync className="animate-spin text-gray-400" />}
            </div>
            <h3 className="text-gray-600 text-sm">Total Cardholders</h3>
            <p className="text-2xl font-bold text-gray-800">{cardholdersData?.stats.total || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-green-100 rounded-full">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              {refreshing && <FaSync className="animate-spin text-gray-400" />}
            </div>
            <h3 className="text-gray-600 text-sm">Online Now</h3>
            <p className="text-2xl font-bold text-gray-800">{cardholdersData?.stats.online || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Real-time updates</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-100 rounded-full">
                <FaCreditCard className="text-purple-600 text-xl" />
              </div>
              {refreshing && <FaSync className="animate-spin text-gray-400" />}
            </div>
            <h3 className="text-gray-600 text-sm">Active Cards</h3>
            <p className="text-2xl font-bold text-gray-800">{cardholdersData?.stats.active || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaMoneyBillWave className="text-yellow-600 text-xl" />
              </div>
              {refreshing && <FaSync className="animate-spin text-gray-400" />}
            </div>
            <h3 className="text-gray-600 text-sm">Total Cards</h3>
            <p className="text-2xl font-bold text-gray-800">{cardholdersData?.stats.totalCards || 0}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amazon_blue"
                />
              </div>
            </form>
            
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amazon_blue"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cardholders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cardholder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cards
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cardholdersData?.cardholders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No cardholders found
                    </td>
                  </tr>
                ) : (
                  cardholdersData?.cardholders.map((cardholder) => (
                    <tr key={cardholder._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{cardholder.name}</div>
                          <div className="text-sm text-gray-500">{cardholder.userId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cardholder.isOnline 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cardholder.isOnline ? (
                            <>
                              <FaCheckCircle className="mr-1" />
                              Online
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="mr-1" />
                              Offline
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{cardholder.cards.length} cards</div>
                        <div className="text-sm text-gray-500">
                          {cardholder.cards.filter(card => card.isActive).length} active
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <FormattedPrice amount={cardholder.earnings.total} />
                        </div>
                        <div className="text-sm text-gray-500">
                          This month: <FormattedPrice amount={cardholder.earnings.thisMonth} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cardholder.lastActiveAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => viewCardholderDetails(cardholder)}
                          className="text-amazon_blue hover:text-blue-700 mr-3"
                          title="View details"
                        >
                          <FaEye className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {cardholdersData?.pagination && cardholdersData.pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === cardholdersData.pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(currentPage - 1) * cardholdersData.pagination.limit + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * cardholdersData.pagination.limit, cardholdersData.pagination.total)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{cardholdersData.pagination.total}</span>
                    {' '}results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: cardholdersData.pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-amazon_blue border-amazon_blue text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cardholder Details Modal */}
      {showDetails && selectedCardholder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Cardholder Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedCardholder.name}</h4>
                  <p className="text-sm text-gray-500">{selectedCardholder.userId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className={`text-sm ${selectedCardholder.isOnline ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedCardholder.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Registered</p>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedCardholder.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Earnings</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium"><FormattedPrice amount={selectedCardholder.earnings.total} /></p>
                    </div>
                    <div>
                      <p className="text-gray-500">This Month</p>
                      <p className="font-medium"><FormattedPrice amount={selectedCardholder.earnings.thisMonth} /></p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pending</p>
                      <p className="font-medium"><FormattedPrice amount={selectedCardholder.earnings.pending} /></p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Cards ({selectedCardholder.cards.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedCardholder.cards.map((card, index) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{card.bankName} •••• {card.lastFourDigits}</p>
                            <p className="text-xs text-gray-500">{card.cardType}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            card.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {card.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Discount: {card.discountPercentage}%</p>
                          <p>Limit: <FormattedPrice amount={card.monthlyLimit} /> | Spent: <FormattedPrice amount={card.currentMonthSpent} /></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCardholders; 