'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, InventoryTransaction } from '@/types';
import { 
  RiArchiveLine, 
  RiFilterLine, 
  RiSearchLine, 
  RiAddLine,
  RiAlertLine,
  RiCheckFill,
  RiFileList3Line
} from 'react-icons/ri';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function InventoryPage() {
  const { userData } = useAuth();
  const { inventoryItems, loading, refetchInventory } = useInventory();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState(0);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    // If there's a highlight ID in the URL, find that item and open the restock modal
    if (highlightId && !loading && inventoryItems.length > 0) {
      const highlightedItem = inventoryItems.find(item => item.id === highlightId);
      if (highlightedItem) {
        setSelectedItem(highlightedItem);
        setRestockAmount(highlightedItem.reorderQuantity || 10);
        setIsRestockModalOpen(true);
      }
    }
  }, [highlightId, loading, inventoryItems]);

  const filteredItems = inventoryItems.filter(item => {
    // Apply status filter
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }
    
    // Apply search filter (case insensitive)
    if (searchQuery && !item.productName.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !item.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const handleOpenRestockModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setRestockAmount(item.reorderQuantity || 10);
    setIsRestockModalOpen(true);
  };

  const handleRestock = async () => {
    if (!selectedItem || !userData) return;

    try {
      // In a real app, this would update the inventory collection
      // For demo, we'll just update the product's stock
      const productRef = doc(db, 'products', selectedItem.productId);
      const newStock = selectedItem.currentStock + restockAmount;
      
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: new Date().toISOString(),
      });

      // Create a transaction record
      const transactionData: Omit<InventoryTransaction, 'id'> = {
        inventoryItemId: selectedItem.id,
        productId: selectedItem.productId,
        type: 'restock',
        quantity: restockAmount,
        previousStock: selectedItem.currentStock,
        newStock: newStock,
        date: new Date().toISOString(),
        notes: `Manual restock by ${userData.displayName}`,
        createdBy: userData.id
      };

      // In a real app, you'd save this to a transactions collection
      console.log('Inventory transaction:', transactionData);

      // Refresh inventory data after restock
      await refetchInventory();

      // Close modal
      setIsRestockModalOpen(false);
    } catch (error) {
      console.error('Error restocking item:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <Link 
              href="/dashboard/inventory/transactions" 
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <RiFileList3Line className="mr-2 h-4 w-4" />
              Transaction History
            </Link>
            <div className="relative flex flex-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <RiSearchLine className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="search"
                placeholder="Search by name or SKU"
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-foreground bg-background ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="block w-full rounded-md border-0 py-1.5 pr-10 text-foreground bg-background ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <RiFilterLine className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
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
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Last Restocked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-foreground">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">ID: {item.productId.substring(0, 8)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {item.sku}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {item.currentStock}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.status === 'in-stock'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : item.status === 'low-stock'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {item.status === 'in-stock' ? (
                            <RiCheckFill className="mr-1 h-3 w-3" />
                          ) : (
                            <RiAlertLine className="mr-1 h-3 w-3" />
                          )}
                          {item.status === 'in-stock'
                            ? 'In Stock'
                            : item.status === 'low-stock'
                            ? 'Low Stock'
                            : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {item.lastRestocked
                          ? new Date(item.lastRestocked).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <button
                          onClick={() => handleOpenRestockModal(item)}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                          <RiAddLine className="mr-1 h-3 w-3" />
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No inventory items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal */}
      {isRestockModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium text-foreground">Restock Inventory</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Current stock for <span className="font-semibold">{selectedItem.productName}</span>: {selectedItem.currentStock}
            </p>
            
            <div className="mb-4">
              <label htmlFor="restockAmount" className="block text-sm font-medium text-foreground">
                Restock Amount
              </label>
              <input
                type="number"
                id="restockAmount"
                min="1"
                className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
              />
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                onClick={handleRestock}
              >
                Confirm Restock
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-border bg-background px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                onClick={() => setIsRestockModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 