'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, InventoryTransaction, Product } from '@/types';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  inventoryItems: InventoryItem[];
  transactions: InventoryTransaction[];
  loading: boolean;
  refetchInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Remove mock transactions

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      // No store filtering needed for single vendor setup
      const productsQuery = query(collection(db, 'products'));
      
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Product[];

      // Convert products to inventory items
      const items: InventoryItem[] = products.map(product => {
        const stockStatus = 
          product.stock === 0
            ? 'out-of-stock'
            : product.stock < 10 
              ? 'low-stock' 
              : 'in-stock';
        
        return {
          id: product.id, // Using product ID as inventory ID for simplicity
          productId: product.id,
          productName: product.name,
          sku: `SKU-${product.id.substring(0, 6).toUpperCase()}`,
          currentStock: product.stock,
          minStockThreshold: 10, // Default threshold
          status: stockStatus,
          lastRestocked: product.updatedAt
        };
      });

      setInventoryItems(items);
      
      // Fetch real transaction data from Firestore
      const transactionsQuery = query(
        collection(db, 'inventory_transactions'),
        orderBy('date', 'desc')
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsData = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryTransaction[];

      setTransactions(transactionsData);
      
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [userData]);

  const value = {
    inventoryItems,
    transactions,
    loading,
    refetchInventory: fetchInventoryData
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
} 