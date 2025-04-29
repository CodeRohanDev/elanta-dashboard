'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from '@/components/ui/use-toast';
import { RiArrowGoBackLine, RiCalendarEventLine } from 'react-icons/ri';
import Link from 'next/link';
import { Category, Product, Promotion } from '@/types';
import ImageUploader from '@/components/ui/ImageUploader';

// Validation schema for the promotion form (same as in new page)
const promotionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  code: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'bogo', 'freeShipping']),
  value: z.number()
    .min(0, 'Value must be non-negative')
    .refine(val => val !== undefined, { message: 'Value is required' }),
  minPurchase: z.number().min(0, 'Minimum purchase must be non-negative').optional(),
  maxDiscount: z.number().min(0, 'Maximum discount must be non-negative').optional(),
  applicableTo: z.enum(['all', 'products', 'categories']),
  targetIds: z.array(z.string()).optional(),
  startDate: z.string().refine(date => !isNaN(new Date(date).getTime()), {
    message: 'Start date is required',
  }),
  endDate: z.string().refine(date => !isNaN(new Date(date).getTime()), {
    message: 'End date is required',
  }),
  isActive: z.boolean(),
  usageLimit: z.number().int().min(0, 'Usage limit must be non-negative').optional(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export default function EditPromotionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalPromotion, setOriginalPromotion] = useState<Promotion | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [bannerImage, setBannerImage] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
  });

  const promotionId = params.id;
  const type = watch('type');
  const applicableTo = watch('applicableTo');

  // Format dates for input fields
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Fetch promotion data and categories/products
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch promotion data
        const promotionDoc = await getDoc(doc(db, 'promotions', promotionId));
        
        if (!promotionDoc.exists()) {
          setNotFound(true);
          toast({
            id: 'not-found',
            title: 'Promotion Not Found',
            description: 'The promotion you are trying to edit does not exist.',
            variant: 'destructive'
          });
          return;
        }
        
        const promotionData = { id: promotionDoc.id, ...promotionDoc.data() } as Promotion;
        setOriginalPromotion(promotionData);
        
        // Set banner image if it exists
        if (promotionData.bannerImage) {
          setBannerImage([promotionData.bannerImage]);
        }
        
        // Format dates for form inputs
        const formattedStartDate = formatDateForInput(promotionData.startDate);
        const formattedEndDate = formatDateForInput(promotionData.endDate);
        
        // Initialize form with promotion data
        reset({
          name: promotionData.name,
          description: promotionData.description || '',
          code: promotionData.code || '',
          type: promotionData.type,
          value: promotionData.value,
          minPurchase: promotionData.minPurchase || 0,
          maxDiscount: promotionData.maxDiscount,
          applicableTo: promotionData.applicableTo,
          targetIds: promotionData.targetIds || [],
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          isActive: promotionData.isActive,
          usageLimit: promotionData.usageLimit,
        });

        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        setCategories(categoriesData);

        // Fetch products
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          id: 'fetch-error',
          title: 'Error',
          description: 'Failed to load promotion data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (promotionId) {
      fetchData();
    }
  }, [promotionId, reset]);

  const onSubmit = async (data: PromotionFormData) => {
    if (!userData || !originalPromotion) {
      toast({
        id: 'auth-error',
        title: 'Error',
        description: 'You must be logged in to update a promotion.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update promotion data in Firestore
      const promotionRef = doc(db, 'promotions', promotionId);
      
      await updateDoc(promotionRef, {
        ...data,
        bannerImage: bannerImage.length > 0 ? bannerImage[0] : null,
        updatedAt: serverTimestamp(),
        updatedBy: {
          uid: userData.id,
          email: userData.email
        }
      });
      
      toast({
        id: 'promotion-updated',
        title: 'Promotion Updated',
        description: 'Your promotion has been updated successfully.',
        variant: 'success'
      });

      // Redirect to promotions list
      router.push('/dashboard/promotions');
    } catch (error) {
      console.error('Error updating promotion:', error);
      toast({
        id: 'submit-error',
        title: 'Error',
        description: 'Failed to update promotion. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if target ID is selected
  const isTargetSelected = (targetId: string) => {
    const targets = watch('targetIds') || [];
    return targets.includes(targetId);
  };

  // Handle target selection
  const handleTargetSelection = (targetId: string, isChecked: boolean) => {
    const currentTargets = watch('targetIds') || [];
    
    if (isChecked) {
      setValue('targetIds', [...currentTargets, targetId]);
    } else {
      setValue('targetIds', currentTargets.filter(id => id !== targetId));
    }
  };

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <h1 className="mt-4 text-3xl font-bold text-foreground">Promotion Not Found</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              The promotion you are looking for doesn't exist or has been deleted.
            </p>
            <Link 
              href="/dashboard/promotions" 
              className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <RiArrowGoBackLine className="mr-2 h-4 w-4" />
              Back to Promotions
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Edit Promotion</h1>
          <Link 
            href="/dashboard/promotions" 
            className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
          >
            <RiArrowGoBackLine className="mr-2 h-4 w-4" />
            Back to Promotions
          </Link>
        </div>

        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">Basic Information</h2>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                    {/* Name */}
                    <div className="col-span-2">
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                        Promotion Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. Summer Sale, Welcome Discount"
                        {...register('name')}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Describe the promotion details"
                        {...register('description')}
                      />
                    </div>

                    {/* Promo Code */}
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1">
                        Promotion Code (Optional)
                      </label>
                      <input
                        id="code"
                        type="text"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. SUMMER20"
                        {...register('code')}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Leave empty if no code is required to apply this promotion
                      </p>
                    </div>

                    {/* Active Status */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Status
                      </label>
                      <div className="flex items-center">
                        <input
                          id="isActive"
                          type="checkbox"
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          {...register('isActive')}
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-foreground">
                          Active
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Inactive promotions won't be applied even during their date range
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Image */}
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">Promotional Banner</h2>
                  <div className="grid gap-6 grid-cols-1">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Banner Image (Optional)
                      </label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add an eye-catching banner image for your promotion. This will be displayed in promotional materials.
                      </p>
                      <ImageUploader 
                        images={bannerImage} 
                        setImages={setBannerImage} 
                        maxImages={1}
                      />
                    </div>
                  </div>
                </div>

                {/* Discount Information */}
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">Discount Information</h2>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                    {/* Discount Type */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">
                        Discount Type
                      </label>
                      <select
                        id="type"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        {...register('type')}
                      >
                        <option value="percentage">Percentage Discount</option>
                        <option value="fixed">Fixed Amount</option>
                        <option value="bogo">Buy One Get One</option>
                        <option value="freeShipping">Free Shipping</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-destructive">{errors.type.message}</p>
                      )}
                    </div>

                    {/* Discount Value */}
                    {type !== 'freeShipping' && (
                      <div>
                        <label htmlFor="value" className="block text-sm font-medium text-foreground mb-1">
                          {type === 'percentage' ? 'Discount Percentage (%)' : 
                           type === 'fixed' ? 'Discount Amount ($)' : 
                           'Number of Free Items'}
                        </label>
                        <input
                          id="value"
                          type="number"
                          min="0"
                          step={type === 'fixed' ? '0.01' : '1'}
                          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          {...register('value', { valueAsNumber: true })}
                        />
                        {errors.value && (
                          <p className="mt-1 text-sm text-destructive">{errors.value.message}</p>
                        )}
                      </div>
                    )}

                    {/* Min Purchase */}
                    <div>
                      <label htmlFor="minPurchase" className="block text-sm font-medium text-foreground mb-1">
                        Minimum Purchase Amount ($)
                      </label>
                      <input
                        id="minPurchase"
                        type="number"
                        min="0"
                        step="0.01"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        {...register('minPurchase', { valueAsNumber: true })}
                      />
                      {errors.minPurchase && (
                        <p className="mt-1 text-sm text-destructive">{errors.minPurchase.message}</p>
                      )}
                    </div>

                    {/* Max Discount */}
                    {type === 'percentage' && (
                      <div>
                        <label htmlFor="maxDiscount" className="block text-sm font-medium text-foreground mb-1">
                          Maximum Discount Amount ($)
                        </label>
                        <input
                          id="maxDiscount"
                          type="number"
                          min="0"
                          step="0.01"
                          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Optional"
                          {...register('maxDiscount', { valueAsNumber: true })}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cap the maximum discount amount (leave empty for no limit)
                        </p>
                        {errors.maxDiscount && (
                          <p className="mt-1 text-sm text-destructive">{errors.maxDiscount.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Applicability */}
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-medium text-foreground mb-4">Applicability</h2>
                  <div className="grid gap-6 grid-cols-1">
                    {/* Apply To */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Apply Promotion To
                      </label>
                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex items-center">
                          <input
                            id="applicableTo-all"
                            type="radio"
                            value="all"
                            className="h-4 w-4 border-input text-primary focus:ring-primary"
                            {...register('applicableTo')}
                          />
                          <label htmlFor="applicableTo-all" className="ml-2 block text-sm text-foreground">
                            All Products
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="applicableTo-categories"
                            type="radio"
                            value="categories"
                            className="h-4 w-4 border-input text-primary focus:ring-primary"
                            {...register('applicableTo')}
                          />
                          <label htmlFor="applicableTo-categories" className="ml-2 block text-sm text-foreground">
                            Specific Categories
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="applicableTo-products"
                            type="radio"
                            value="products"
                            className="h-4 w-4 border-input text-primary focus:ring-primary"
                            {...register('applicableTo')}
                          />
                          <label htmlFor="applicableTo-products" className="ml-2 block text-sm text-foreground">
                            Specific Products
                          </label>
                        </div>
                      </div>
                      {errors.applicableTo && (
                        <p className="mt-1 text-sm text-destructive">{errors.applicableTo.message}</p>
                      )}
                    </div>

                    {/* Target Categories */}
                    {applicableTo === 'categories' && (
                      <div>
                        <label htmlFor="targetCategories" className="block text-sm font-medium text-foreground mb-2">
                          Select Categories
                        </label>
                        <div className="border border-input rounded-md">
                          {/* Search input for categories */}
                          <div className="p-2 border-b border-input">
                            <input
                              type="text"
                              placeholder="Search categories..."
                              className="w-full px-3 py-1.5 text-sm border border-input rounded-md"
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2">
                            {isLoading ? (
                              <div className="flex items-center justify-center h-20">
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {categories
                                  .filter(category => 
                                    category.name.toLowerCase().includes(categorySearch.toLowerCase())
                                  )
                                  .map(category => (
                                    <div key={category.id} className="flex items-center">
                                      <input
                                        id={`category-${category.id}`}
                                        type="checkbox"
                                        value={category.id}
                                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                        checked={isTargetSelected(category.id)}
                                        onChange={(e) => handleTargetSelection(category.id, e.target.checked)}
                                      />
                                      <label htmlFor={`category-${category.id}`} className="ml-2 block text-sm text-foreground">
                                        {category.name}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {applicableTo === 'categories' && watch('targetIds')?.length === 0 && (
                          <p className="mt-1 text-sm text-destructive">Please select at least one category</p>
                        )}
                      </div>
                    )}

                    {/* Target Products */}
                    {applicableTo === 'products' && (
                      <div>
                        <label htmlFor="targetProducts" className="block text-sm font-medium text-foreground mb-2">
                          Select Products
                        </label>
                        <div className="border border-input rounded-md">
                          {/* Search input for products */}
                          <div className="p-2 border-b border-input">
                            <input
                              type="text"
                              placeholder="Search products..."
                              className="w-full px-3 py-1.5 text-sm border border-input rounded-md"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2">
                            {isLoading ? (
                              <div className="flex items-center justify-center h-20">
                                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {products
                                  .filter(product => 
                                    product.name.toLowerCase().includes(productSearch.toLowerCase())
                                  )
                                  .map(product => (
                                    <div key={product.id} className="flex items-center">
                                      <input
                                        id={`product-${product.id}`}
                                        type="checkbox"
                                        value={product.id}
                                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                        checked={isTargetSelected(product.id)}
                                        onChange={(e) => handleTargetSelection(product.id, e.target.checked)}
                                      />
                                      <label htmlFor={`product-${product.id}`} className="ml-2 block text-sm text-foreground">
                                        {product.name} <span className="text-xs text-muted-foreground">(${product.price})</span>
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {applicableTo === 'products' && watch('targetIds')?.length === 0 && (
                          <p className="mt-1 text-sm text-destructive">Please select at least one product</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Duration & Limits */}
                <div>
                  <h2 className="text-lg font-medium text-foreground mb-4">Duration & Limits</h2>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                    {/* Start Date */}
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1">
                        Start Date
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <RiCalendarEventLine className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                          id="startDate"
                          type="date"
                          className="block w-full rounded-md border border-input bg-background pl-10 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          {...register('startDate')}
                        />
                      </div>
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-destructive">{errors.startDate.message}</p>
                      )}
                    </div>

                    {/* End Date */}
                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-1">
                        End Date
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <RiCalendarEventLine className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                          id="endDate"
                          type="date"
                          className="block w-full rounded-md border border-input bg-background pl-10 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          {...register('endDate')}
                        />
                      </div>
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-destructive">{errors.endDate.message}</p>
                      )}
                    </div>

                    {/* Usage Limit */}
                    <div>
                      <label htmlFor="usageLimit" className="block text-sm font-medium text-foreground mb-1">
                        Usage Limit (Optional)
                      </label>
                      <input
                        id="usageLimit"
                        type="number"
                        min="0"
                        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Unlimited"
                        {...register('usageLimit', { valueAsNumber: true })}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Maximum number of times this promotion can be used (leave empty for unlimited)
                      </p>
                      {errors.usageLimit && (
                        <p className="mt-1 text-sm text-destructive">{errors.usageLimit.message}</p>
                      )}
                    </div>

                    {/* Usage Count (Non-editable) */}
                    {originalPromotion && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Current Usage Count
                        </label>
                        <div className="block w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-foreground">
                          {originalPromotion.usageCount || 0}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Number of times this promotion has been used so far
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-primary-foreground"></div>
                        Updating...
                      </>
                    ) : 'Update Promotion'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 