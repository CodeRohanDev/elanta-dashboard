'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RiAddLine, RiEditLine, RiDeleteBinLine, RiFileUploadLine, RiSearchLine, RiCloseLine } from 'react-icons/ri';
import Link from 'next/link';
import BulkCategoryUpload from '@/components/categories/BulkCategoryUpload';
import { toast } from 'sonner';
import { deleteCategory } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  productCount?: number;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not admin
    if (userData && userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchCategories();
  }, [userData, router]);

  // Apply search filter on categories whenever search query or categories change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCategories(categories);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const filtered = categories.filter(category => 
      category.name.toLowerCase().includes(query) ||
      (category.description && category.description.toLowerCase().includes(query))
    );
    setFilteredCategories(filtered);
  }, [searchQuery, categories]);

  async function fetchCategories() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'categories'),
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      
      setCategories(categoriesData);
      setFilteredCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    
    try {
      setIsDeleting(true);
      await deleteCategory(deletingCategory.id);
      toast.success(`Category "${deletingCategory.name}" has been deleted.`);
      
      // Refresh the categories list
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeletingCategory(null);
    }
  };

  const cancelDelete = () => {
    setDeletingCategory(null);
  };

  if (userData && userData.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-secondary"
            >
              <RiFileUploadLine className="h-5 w-5 mr-2" />
              {showBulkUpload ? 'Hide Bulk Upload' : 'Bulk Upload'}
            </button>
            <Link
              href="/dashboard/categories/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <RiAddLine className="h-5 w-5 mr-2" />
              Add Category
            </Link>
          </div>
        </div>

        {showBulkUpload && (
          <div className="mb-6">
            <BulkCategoryUpload />
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <RiSearchLine className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={clearSearch}
            >
              <RiCloseLine className="h-5 w-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Products
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {isSearching ? `No categories found matching "${searchQuery}"` : 'No categories found. Create your first category!'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {category.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {category.productCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/dashboard/categories/${category.id}/edit`} className="text-primary hover:text-primary/90">
                            <RiEditLine className="h-5 w-5" />
                          </Link>
                          <button 
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => handleDeleteClick(category)}
                          >
                            <RiDeleteBinLine className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Confirm Delete</h3>
              <p className="mb-6 text-muted-foreground">
                Are you sure you want to delete the category <span className="font-semibold text-foreground">{deletingCategory.name}</span>? 
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-muted"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 