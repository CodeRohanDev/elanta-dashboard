'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/contexts/InventoryContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { InventoryTransaction } from '@/types';
import { 
  RiArchiveLine, 
  RiFilterLine, 
  RiSearchLine, 
  RiTimeLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiSortAsc,
  RiSortDesc,
  RiFileDownloadLine,
  RiCalendarEventLine,
  RiCloseLine
} from 'react-icons/ri';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';

export default function InventoryTransactionsPage() {
  const { transactions, loading } = useInventory();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filteredTransactions, setFilteredTransactions] = useState<InventoryTransaction[]>([]);

  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
    let filtered = [...transactions];
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }
    
    // Apply date range filter
    if (filterDateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filterDateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate;
      });
    }
    
    // Apply search filter (case insensitive)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.productId.toLowerCase().includes(query) || 
        transaction.notes?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }
      
      return sortDirection === 'asc'
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, filterType, filterDateRange, searchQuery, sortField, sortDirection]);

  // Format the transaction type into a readable string
  const formatTransactionType = (type: string) => {
    const typeMap: Record<string, string> = {
      'restock': 'Restock',
      'adjustment': 'Adjustment',
      'sale': 'Sale',
      'return': 'Return',
      'damage': 'Damage'
    };
    
    return typeMap[type] || type;
  };

  // Handle sorting toggle
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    // Only proceed if we have transactions
    if (filteredTransactions.length === 0) {
      toast({
        id: 'export-failed',
        title: "Export Failed",
        description: "No transactions to export",
        variant: "destructive"
      });
      return;
    }
    
    // CSV header row
    const headers = ['Date', 'Product ID', 'Type', 'Quantity', 'Previous Stock', 'New Stock', 'Notes'];
    
    // Format transaction data as CSV rows
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map(transaction => [
        new Date(transaction.date).toLocaleString(),
        transaction.productId,
        formatTransactionType(transaction.type),
        transaction.quantity,
        transaction.previousStock,
        transaction.newStock,
        `"${transaction.notes?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ];
    
    // Create a Blob containing the CSV data
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      id: 'export-success',
      title: "Export Successful",
      description: `${filteredTransactions.length} transactions exported to CSV`,
      variant: "success"
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Transactions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View history of all inventory changes and movements
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
            >
              <RiFileDownloadLine className="mr-2 h-4 w-4" />
              Export CSV
            </button>
            <Link 
              href="/dashboard/inventory" 
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <RiArchiveLine className="mr-2 h-4 w-4" />
              Back to Inventory
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
              placeholder="Search by product ID or notes"
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="restock">Restock</option>
              <option value="adjustment">Adjustment</option>
              <option value="sale">Sale</option>
              <option value="return">Return</option>
              <option value="damage">Damage</option>
            </select>
          </div>
          <div className="relative lg:col-span-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <RiCalendarEventLine className="h-5 w-5 text-muted-foreground" />
            </div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-foreground bg-background ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Count display */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort('date')}
                  >
                    <div className="flex items-center">
                      Date
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? 
                          <RiSortAsc className="ml-1 h-4 w-4" /> : 
                          <RiSortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product ID
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortField === 'type' && (
                        sortDirection === 'asc' ? 
                          <RiSortAsc className="ml-1 h-4 w-4" /> : 
                          <RiSortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer"
                    onClick={() => toggleSort('quantity')}
                  >
                    <div className="flex items-center">
                      Quantity
                      {sortField === 'quantity' && (
                        sortDirection === 'asc' ? 
                          <RiSortAsc className="ml-1 h-4 w-4" /> : 
                          <RiSortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stock Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <RiTimeLine className="mr-1.5 h-4 w-4 text-muted-foreground/70" />
                          <span>{new Date(transaction.date).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {transaction.productId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            transaction.type === 'restock'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : transaction.type === 'adjustment'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : transaction.type === 'sale'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                              : transaction.type === 'return'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {formatTransactionType(transaction.type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <span className={transaction.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          {transaction.previousStock} 
                          <span className="mx-2 text-muted-foreground/60">→</span> 
                          {transaction.newStock}
                          {transaction.newStock > transaction.previousStock ? (
                            <RiArrowUpLine className="ml-1 h-4 w-4 text-green-500 dark:text-green-400" />
                          ) : transaction.newStock < transaction.previousStock ? (
                            <RiArrowDownLine className="ml-1 h-4 w-4 text-red-500 dark:text-red-400" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="max-w-xs truncate">
                          {transaction.notes}
                          {transaction.referenceId && (
                            <span className="ml-1 text-primary">
                              (Ref: {transaction.referenceId})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No transactions found matching your filters. Try creating some inventory adjustments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 