'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { collection, getDocs, query, orderBy, limit, startAfter, doc, deleteDoc, getCountFromServer, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Category } from '@/types';
import Link from 'next/link';
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine, 
  RiFileUploadLine, 
  RiArrowLeftLine, 
  RiArrowRightLine,
  RiSearchLine,
  RiCloseLine
} from 'react-icons/ri';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BulkProductUpload from '@/components/products/BulkProductUpload';

const PRODUCTS_PER_PAGE = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    productId: '',
    productName: ''
  });
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lastVisibleProduct, setLastVisibleProduct] = useState<any>(null);
  const [firstPage, setFirstPage] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProductCount();
    fetchProducts();
  }, []);

  // Apply search filter on products whenever search query or products change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query)) ||
      (categoryMap[product.category] && categoryMap[product.category].toLowerCase().includes(query))
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products, categoryMap]);

  async function fetchCategories() {
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoryMapping: Record<string, string> = {};
      
      // First, create a map of all categories
      const allCategories: Record<string, Category> = {};
      categoriesSnapshot.docs.forEach(doc => {
        const categoryData = doc.data() as Category;
        allCategories[doc.id] = {
          id: doc.id,
          ...categoryData,
          subcategories: []
        };
      });
      
      // Build parent-child relationships
      Object.values(allCategories).forEach(category => {
        if (category.parentId && allCategories[category.parentId]) {
          if (!allCategories[category.parentId].subcategories) {
            allCategories[category.parentId].subcategories = [];
          }
          allCategories[category.parentId].subcategories!.push(category);
        }
      });
      
      // Create the category mapping
      Object.values(allCategories).forEach(category => {
        categoryMapping[category.id] = category.name;
        
        // Add subcategories to the mapping
        if (category.subcategories && category.subcategories.length > 0) {
          category.subcategories.forEach(subcat => {
            categoryMapping[subcat.id] = `${category.name} > ${subcat.name}`;
          });
        }
      });
      
      setCategoryMap(categoryMapping);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function fetchProductCount() {
    try {
      const countSnapshot = await getCountFromServer(collection(db, 'products'));
      const count = countSnapshot.data().count;
      setTotalProducts(count);
      setTotalPages(Math.ceil(count / PRODUCTS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching product count:', error);
    }
  }

  async function fetchProducts(pageNumber = 1) {
    try {
      setLoading(true);
      
      let q;
      if (pageNumber === 1) {
        // First page query
        q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(PRODUCTS_PER_PAGE)
        );
        setFirstPage(true);
      } else if (lastVisibleProduct && pageNumber > currentPage) {
        // Next page query
        q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleProduct),
          limit(PRODUCTS_PER_PAGE)
        );
        setFirstPage(false);
      } else {
        // If going back or jumping to a specific page, we need to start from the beginning
        // and paginate forward to the desired page
        q = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc'),
          limit(PRODUCTS_PER_PAGE * (pageNumber))
        );
        setFirstPage(pageNumber === 1);
      }

      const querySnapshot = await getDocs(q);
      
      // If we're paginating forward from the beginning to reach a specific page
      // we need to slice the results to get just the last page
      let productsData;
      if (pageNumber > 1 && pageNumber > currentPage && !lastVisibleProduct) {
        const allDocs = querySnapshot.docs;
        const startIdx = (pageNumber - 1) * PRODUCTS_PER_PAGE;
        const pageDocuments = allDocs.slice(startIdx);
        productsData = pageDocuments.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
      } else {
        productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
      }
      
      // Update the last visible document
      if (querySnapshot.docs.length > 0) {
        setLastVisibleProduct(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setLastVisibleProduct(null);
      }
        
      setProducts(productsData);
      setFilteredProducts(productsData);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      fetchProducts(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      fetchProducts(currentPage - 1);
    }
  };

  const openDeleteConfirmation = (productId: string, productName: string) => {
    setConfirmDialog({
      isOpen: true,
      productId,
      productName
    });
  };

  const closeDeleteConfirmation = () => {
    setConfirmDialog({
      isOpen: false,
      productId: '',
      productName: ''
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeleting(productId);
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);
      
      // Update the UI and product count
      setProducts(products.filter(product => product.id !== productId));
      setTotalProducts(prev => prev - 1);
      setTotalPages(Math.ceil((totalProducts - 1) / PRODUCTS_PER_PAGE));
      
      toast({
        id: `delete-${productId}`,
        title: 'Success',
        description: 'Product deleted successfully',
        variant: 'success',
      });
      
      // If we delete the last product on the page and it's not the first page,
      // go to the previous page
      if (products.length === 1 && currentPage > 1) {
        fetchProducts(currentPage - 1);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        id: 'delete-error',
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
      closeDeleteConfirmation();
    }
  };

  // Helper function to get category name
  const getCategoryName = (categoryId: string) => {
    return categoryMap[categoryId] || categoryId;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-secondary"
            >
              <RiFileUploadLine className="h-5 w-5 mr-2" />
              {showBulkUpload ? 'Hide Bulk Upload' : 'Bulk Upload'}
            </button>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <RiAddLine className="h-5 w-5 mr-2" />
              Add Product
            </Link>
          </div>
        </div>

        {showBulkUpload && (
          <div className="mb-6">
            <BulkProductUpload />
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
            placeholder="Search products by name, description, or category..."
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
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-secondary">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Stock
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        {isSearching ? `No products found matching "${searchQuery}"` : 'No products found. Create your first product!'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-secondary/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {product.images && product.images[0] ? (
                                <img className="h-10 w-10 rounded-md object-cover" src={product.images[0]} alt={product.name} />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                                  No img
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">{product.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {getCategoryName(product.category)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.isActive 
                              ? 'bg-green-100/50 dark:bg-green-950/50 text-green-800 dark:text-green-300' 
                              : 'bg-red-100/50 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/dashboard/products/${product.id}/edit`} className="text-primary hover:text-primary/90">
                              <RiEditLine className="h-5 w-5" />
                            </Link>
                            <button 
                              className="text-destructive hover:text-destructive/90 disabled:opacity-50"
                              onClick={() => openDeleteConfirmation(product.id, product.name)}
                              disabled={deleting === product.id}
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
            
            {/* Pagination */}
            <div className="py-3 flex items-center justify-between">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{products.length > 0 ? ((currentPage - 1) * PRODUCTS_PER_PAGE) + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts)}</span> of{' '}
                    <span className="font-medium">{totalProducts}</span> products
                  </p>
                </div>
                <div>
                  <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium ${
                        currentPage === 1
                          ? 'text-muted-foreground cursor-not-allowed'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <RiArrowLeftLine className="h-5 w-5" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => fetchProducts(page)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          page === currentPage
                            ? 'z-10 bg-primary/10 border-primary text-primary'
                            : 'bg-card border-border text-foreground hover:bg-secondary'
                        } text-sm font-medium`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-muted-foreground cursor-not-allowed'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <RiArrowRightLine className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Product"
        message={
          <>
            Are you sure you want to delete <span className="font-medium">{confirmDialog.productName}</span>? 
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => handleDeleteProduct(confirmDialog.productId)}
        onCancel={closeDeleteConfirmation}
      />
    </DashboardLayout>
  );
} 