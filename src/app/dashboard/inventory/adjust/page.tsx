'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInventory } from '@/contexts/InventoryContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, InventoryTransaction } from '@/types';
import { 
  RiArrowGoBackLine, 
  RiAddLine, 
  RiSubtractLine,
  RiErrorWarningLine, 
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';

export default function AdjustInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');
  const { userData } = useAuth();
  const { inventoryItems, refetchInventory } = useInventory();
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newStockPreview, setNewStockPreview] = useState<number | null>(null);

  useEffect(() => {
    if (itemId && inventoryItems.length > 0) {
      const item = inventoryItems.find(item => item.id === itemId);
      if (item) {
        setSelectedItem(item);
        setNewStockPreview(item.currentStock);
      }
    }
  }, [itemId, inventoryItems]);

  useEffect(() => {
    if (!selectedItem) return;
    
    let newStock = selectedItem.currentStock;
    
    switch (adjustmentType) {
      case 'add':
        newStock = selectedItem.currentStock + adjustmentAmount;
        break;
      case 'subtract':
        newStock = selectedItem.currentStock - adjustmentAmount;
        break;
      case 'set':
        newStock = adjustmentAmount;
        break;
    }
    
    // Ensure stock doesn't go negative
    newStock = Math.max(0, newStock);
    setNewStockPreview(newStock);
  }, [selectedItem, adjustmentType, adjustmentAmount]);

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const item = inventoryItems.find(item => item.id === e.target.value);
    if (item) {
      setSelectedItem(item);
      setNewStockPreview(item.currentStock);
      // Update URL query parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set('id', item.id);
      router.push(`/dashboard/inventory/adjust?${params.toString()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItem || !userData || !newStockPreview) return;
    
    setIsSubmitting(true);
    
    try {
      // Create the transaction type based on the adjustment
      let transactionType: 'restock' | 'adjustment' | 'damage' = 'adjustment';
      
      if (adjustmentReason.toLowerCase().includes('damage') || adjustmentReason.toLowerCase().includes('broken')) {
        transactionType = 'damage';
      } else if (adjustmentType === 'add') {
        transactionType = 'restock';
      }
      
      // Update the product's stock in Firestore
      const productRef = doc(db, 'products', selectedItem.productId);
      await updateDoc(productRef, {
        stock: newStockPreview,
        updatedAt: serverTimestamp(),
      });
      
      // Create a transaction record
      const transactionData: Omit<InventoryTransaction, 'id'> = {
        inventoryItemId: selectedItem.id,
        productId: selectedItem.productId,
        type: transactionType,
        quantity: adjustmentType === 'subtract' ? -adjustmentAmount : 
                 adjustmentType === 'add' ? adjustmentAmount : 
                 newStockPreview - selectedItem.currentStock,
        previousStock: selectedItem.currentStock,
        newStock: newStockPreview,
        date: new Date().toISOString(),
        notes: adjustmentReason || `Manual ${transactionType} by ${userData.displayName}`,
        createdBy: userData.id
      };
      
      // In a real app, we'd save this to a transactions collection
      await addDoc(collection(db, 'inventory_transactions'), transactionData);

      // Refresh inventory data
      await refetchInventory();
      
      toast({
        id: Date.now().toString(),
        title: "Inventory Adjusted",
        description: `Successfully updated stock for ${selectedItem.productName}`,
        variant: "success"
      });
      
      // Redirect back to inventory page
      router.push('/dashboard/inventory');
      
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast({
        id: Date.now().toString(),
        title: "Error",
        description: "Failed to adjust inventory. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Adjust Inventory</h1>
          <Link 
            href="/dashboard/inventory" 
            className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
          >
            <RiArrowGoBackLine className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Item Selection */}
              <div>
                <label htmlFor="item" className="block text-sm font-medium text-foreground">
                  Select Item
                </label>
                <select
                  id="item"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedItem?.id || ''}
                  onChange={handleItemChange}
                  required
                >
                  <option value="">Select an item to adjust</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.productName} (SKU: {item.sku}) - Current Stock: {item.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <>
                  {/* Current Stock Info */}
                  <div className="rounded-md bg-muted p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Current Stock</h3>
                        <p className="mt-1 text-2xl font-bold text-foreground">{selectedItem.currentStock}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground">Status</h3>
                        <p className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          selectedItem.status === 'in-stock'
                            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                            : selectedItem.status === 'low-stock'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {selectedItem.status === 'in-stock'
                            ? 'In Stock'
                            : selectedItem.status === 'low-stock'
                            ? 'Low Stock'
                            : 'Out of Stock'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Adjustment Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Adjustment Type
                    </label>
                    <div className="mt-2 flex rounded-md shadow-sm">
                      <button
                        type="button"
                        className={`flex-1 rounded-l-md border px-4 py-2 text-sm font-medium ${
                          adjustmentType === 'add'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setAdjustmentType('add')}
                      >
                        <RiAddLine className="mr-1 inline h-4 w-4" />
                        Add Stock
                      </button>
                      <button
                        type="button"
                        className={`flex-1 border-y px-4 py-2 text-sm font-medium ${
                          adjustmentType === 'subtract'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setAdjustmentType('subtract')}
                      >
                        <RiSubtractLine className="mr-1 inline h-4 w-4" />
                        Remove Stock
                      </button>
                      <button
                        type="button"
                        className={`flex-1 rounded-r-md border px-4 py-2 text-sm font-medium ${
                          adjustmentType === 'set'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background text-foreground hover:bg-muted'
                        }`}
                        onClick={() => {
                          setAdjustmentType('set');
                          setAdjustmentAmount(selectedItem.currentStock);
                        }}
                      >
                        Set Exact Value
                      </button>
                    </div>
                  </div>

                  {/* Adjustment Amount */}
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-foreground">
                      {adjustmentType === 'add' 
                        ? 'Amount to Add' 
                        : adjustmentType === 'subtract'
                        ? 'Amount to Remove'
                        : 'New Stock Level'}
                    </label>
                    <input
                      type="number"
                      id="amount"
                      min={0}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      required
                    />
                  </div>

                  {/* Adjustment Reason */}
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-foreground">
                      Reason for Adjustment
                    </label>
                    <textarea
                      id="reason"
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Enter the reason for this adjustment"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                    />
                  </div>

                  {/* New Stock Preview */}
                  <div className="rounded-md bg-muted p-4">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-foreground">New Stock Level</h3>
                        <p className="mt-1 text-2xl font-bold text-foreground">{newStockPreview}</p>
                      </div>
                      {newStockPreview !== null && (
                        <div className="ml-4">
                          {newStockPreview < selectedItem.minStockThreshold ? (
                            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                              <RiErrorWarningLine className="mr-1 h-5 w-5" />
                              <span className="text-sm">Below minimum stock threshold</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                              <RiCheckboxCircleLine className="mr-1 h-5 w-5" />
                              <span className="text-sm">Stock level is good</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || adjustmentAmount === 0 || newStockPreview === selectedItem.currentStock}
                      className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adjusting...' : 'Update Inventory'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
} 