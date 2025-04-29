import { useState, useMemo } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import { Product } from '@/types';
import { RiAlertLine, RiArrowRightLine } from 'react-icons/ri';
import Link from 'next/link';

interface LowStockAlertsProps {
  threshold?: number;
  limit?: number;
}

export default function LowStockAlerts({ threshold = 10, limit = 5 }: LowStockAlertsProps) {
  const { inventoryItems, loading } = useInventory();
  
  // Derive low stock items from inventory items
  const lowStockItems = useMemo(() => {
    // Convert inventory items to product-like objects for compatibility
    const products = inventoryItems
      .filter(item => item.currentStock < threshold)
      .map(item => ({
        id: item.productId,
        name: item.productName,
        stock: item.currentStock
      } as Product));
    
    // Sort by stock level (lowest first) and limit the count
    return products
      .sort((a, b) => a.stock - b.stock)
      .slice(0, limit);
  }, [inventoryItems, threshold, limit]);
  
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow">
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (lowStockItems.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow">
        <h2 className="mb-4 text-lg font-medium text-card-foreground">Inventory Status</h2>
        <div className="flex items-center rounded-lg bg-green-100/50 dark:bg-green-950/50 p-4 text-sm text-green-800 dark:text-green-300">
          <div className="mr-3 flex-shrink-0">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
          </div>
          <p>All products are well-stocked! No low inventory alerts.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-card-foreground">Low Stock Alerts</h2>
        <Link 
          href="/dashboard/inventory" 
          className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/90"
        >
          View all <RiArrowRightLine className="ml-1" />
        </Link>
      </div>
      
      <div className="divide-y divide-border">
        {lowStockItems.map((item) => (
          <div key={item.id} className="flex items-center py-3">
            <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100/50 dark:bg-red-950/50 text-red-500 dark:text-red-400">
              <RiAlertLine className="h-5 w-5" />
            </div>
            <div className="flex-grow">
              <p className="font-medium text-card-foreground">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                Current stock: <span className="font-semibold text-red-600 dark:text-red-400">{item.stock}</span> units
              </p>
            </div>
            <Link
              href={`/dashboard/inventory?highlight=${item.id}`}
              className="ml-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              Restock
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
} 