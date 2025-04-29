'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { collection, getDocs, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Promotion } from '@/types';
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiFileUploadLine,
  RiSearchLine, 
  RiFilterLine,
  RiCalendarEventLine,
  RiCloseLine,
  RiArrowRightLine,
  RiPriceTag3Line
} from 'react-icons/ri';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function PromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    promotionId: '',
    promotionName: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchPromotions();
  }, []);

  useEffect(() => {
    // Apply filters to promotions
    let filtered = [...promotions];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(promo => 
        promo.name.toLowerCase().includes(query) || 
        (promo.description && promo.description.toLowerCase().includes(query)) ||
        (promo.code && promo.code.toLowerCase().includes(query))
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      const now = new Date();
      
      if (filterStatus === 'active') {
        filtered = filtered.filter(promo => 
          promo.isActive && 
          new Date(promo.startDate) <= now && 
          new Date(promo.endDate) >= now
        );
      } else if (filterStatus === 'scheduled') {
        filtered = filtered.filter(promo => 
          promo.isActive && 
          new Date(promo.startDate) > now
        );
      } else if (filterStatus === 'expired') {
        filtered = filtered.filter(promo => 
          new Date(promo.endDate) < now
        );
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(promo => 
          !promo.isActive
        );
      }
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(promo => promo.type === filterType);
    }
    
    setFilteredPromotions(filtered);
  }, [promotions, searchQuery, filterStatus, filterType]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const promotionsQuery = query(
        collection(db, 'promotions'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(promotionsQuery);
      const promotionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Promotion[];
      
      setPromotions(promotionsData);
      setFilteredPromotions(promotionsData);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        id: 'fetch-error',
        title: 'Error',
        description: 'Failed to load promotions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (promotionId: string, promotionName: string) => {
    setConfirmDialog({
      isOpen: true,
      promotionId,
      promotionName
    });
  };

  const closeDeleteConfirmation = () => {
    setConfirmDialog({
      isOpen: false,
      promotionId: '',
      promotionName: ''
    });
  };

  const handleDeletePromotion = async (promotionId: string) => {
    try {
      setDeleting(promotionId);
      await deleteDoc(doc(db, 'promotions', promotionId));
      
      // Update the local state
      setPromotions(prevPromotions => 
        prevPromotions.filter(promo => promo.id !== promotionId)
      );
      
      toast({
        id: 'delete-success',
        title: 'Promotion Deleted',
        description: 'The promotion has been successfully deleted.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        id: 'delete-error',
        title: 'Error',
        description: 'Failed to delete promotion. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
      closeDeleteConfirmation();
    }
  };

  // Status badge component
  const StatusBadge = ({ promotion }: { promotion: Promotion }) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    let status: 'active' | 'scheduled' | 'expired' | 'inactive' = 'inactive';
    
    if (!promotion.isActive) {
      status = 'inactive';
    } else if (startDate > now) {
      status = 'scheduled';
    } else if (endDate < now) {
      status = 'expired';
    } else {
      status = 'active';
    }
    
    const statusClasses = {
      active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format dates for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format promotion type for display
  const formatType = (type: string) => {
    const typeMap: Record<string, string> = {
      'percentage': 'Percentage',
      'fixed': 'Fixed Amount',
      'bogo': 'Buy One Get One',
      'freeShipping': 'Free Shipping'
    };
    
    return typeMap[type] || type;
  };

  // Format value based on promotion type
  const formatValue = (promotion: Promotion) => {
    if (promotion.type === 'percentage') {
      return `${promotion.value}%`;
    } else if (promotion.type === 'fixed') {
      return `$${promotion.value.toFixed(2)}`;
    } else if (promotion.type === 'bogo') {
      return 'Buy 1 Get 1';
    } else if (promotion.type === 'freeShipping') {
      return 'Free Shipping';
    }
    return promotion.value;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Promotions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage discounts, offers, and promotional campaigns
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
            <Link 
              href="/dashboard/promotions/new" 
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <RiAddLine className="mr-2 h-4 w-4" />
              New Promotion
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 grid gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiSearchLine className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="search"
              placeholder="Search promotions by name or code..."
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-foreground bg-background ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setSearchQuery('')}
              >
                <RiCloseLine className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <div className="relative lg:col-span-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiFilterLine className="h-5 w-5 text-muted-foreground" />
            </div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-foreground bg-background ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="relative lg:col-span-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiPriceTag3Line className="h-5 w-5 text-muted-foreground" />
            </div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-foreground bg-background ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="percentage">Percentage Discount</option>
              <option value="fixed">Fixed Amount</option>
              <option value="bogo">Buy One Get One</option>
              <option value="freeShipping">Free Shipping</option>
            </select>
          </div>
        </div>

        {/* Count display */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredPromotions.length} promotion{filteredPromotions.length !== 1 ? 's' : ''} found
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border shadow">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Banner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredPromotions.length > 0 ? (
                  filteredPromotions.map((promotion) => (
                    <tr key={promotion.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                        {promotion.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {promotion.bannerImage ? (
                          <div className="h-12 w-24 relative overflow-hidden rounded-md border border-border">
                            <img 
                              src={promotion.bannerImage} 
                              alt={`${promotion.name} banner`} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">No banner</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {promotion.code ? (
                          <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                            {promotion.code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">No code</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {formatType(promotion.type)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {formatValue(promotion)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{formatDate(promotion.startDate)}</span>
                          <span className="flex items-center text-muted-foreground/70">
                            <RiArrowRightLine className="mx-1 h-3 w-3" />
                            {formatDate(promotion.endDate)}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <StatusBadge promotion={promotion} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/dashboard/promotions/${promotion.id}/edit`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <RiEditLine className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Link>
                          <button
                            onClick={() => openDeleteConfirmation(promotion.id, promotion.name)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            disabled={deleting === promotion.id}
                          >
                            {deleting === promotion.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600 dark:border-red-400"></div>
                            ) : (
                              <RiDeleteBinLine className="h-4 w-4" />
                            )}
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No promotions found matching your filters. Create a new promotion to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Delete Promotion"
          message={`Are you sure you want to delete the promotion "${confirmDialog.promotionName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDeletePromotion(confirmDialog.promotionId)}
          onCancel={closeDeleteConfirmation}
          variant="danger"
        />
      </div>
    </DashboardLayout>
  );
} 