'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { createCategory, getCategories } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/components/ui/use-toast';
import { slugify } from '@/lib/utils';
import { Category } from '@/types';
import ImageUploader from '@/components/ui/ImageUploader';

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// Define a local extension of the Category interface to include description
interface CategoryWithDescription extends Omit<Category, 'id'> {
  description?: string;
}

export default function NewCategoryPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryImage, setCategoryImage] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
    }
  });

  // Fetch parent categories on component mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const categories = await getCategories();
        
        // Filter out categories that have a parentId to get only top-level categories
        const topLevelCategories = categories.filter(cat => !cat.parentId);
        setParentCategories(topLevelCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch parent categories.',
          variant: 'destructive',
          id: Date.now().toString(),
        });
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Redirect if not admin
  if (userData && userData.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Generate slug from name
      const slug = slugify(data.name);
      
      // Prepare category data starting with required fields
      const categoryData: Omit<Category, 'id'> = {
        name: data.name,
        slug,
      };
      
      // Add description if present
      if (data.description) {
        // Use type assertion to add the description property
        (categoryData as any).description = data.description;
      }
      
      // Add parentId if present
      if (data.parentId) {
        categoryData.parentId = data.parentId;
      }
      
      // Add image if present
      if (categoryImage.length > 0) {
        categoryData.image = categoryImage[0];
      }
      
      console.log('Creating category with data:', categoryData);
      
      // Submit to API
      const result = await createCategory(categoryData);
      console.log('Category created successfully:', result);
      
      // Show success message
      toast({
        title: 'Success!',
        description: 'Category has been created successfully.',
        variant: 'success',
        id: Date.now().toString(),
      });
      
      // Redirect back to categories list
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        id: Date.now().toString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Add New Category</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-background hover:bg-muted"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card shadow rounded-lg p-6 border border-border">
          {error && (
            <div className="p-4 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Category Name *
              </label>
              <input
                type="text"
                id="name"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. Electronics, Clothing, etc."
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the category (optional)"
                {...register('description')}
              />
            </div>

            <div>
              <label htmlFor="parentId" className="block text-sm font-medium text-foreground mb-1">
                Parent Category (Optional)
              </label>
              <select
                id="parentId"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('parentId')}
                disabled={loading}
              >
                <option value="">No parent (top-level category)</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="mt-1 text-sm text-muted-foreground">Loading parent categories...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Category Image (Optional)
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload an image to represent this category
              </p>
              <ImageUploader 
                images={categoryImage} 
                setImages={setCategoryImage} 
                maxImages={1}
                folderType="categories"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-primary/70 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating Category...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 