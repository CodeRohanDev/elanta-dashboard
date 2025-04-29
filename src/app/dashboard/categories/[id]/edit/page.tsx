'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCategory, updateCategory, getCategories } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { Category } from '@/types';
import ImageUploader from '@/components/ui/ImageUploader';

// Define a local extension of the Category interface
interface CategoryWithDescription extends Omit<Category, 'id'> {
  id: string;
  description?: string;
}

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryWithDescription | null>(null);
  const [categoryImage, setCategoryImage] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
    }
  });

  // Fetch category and parent categories on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch the category to edit
        const categoryData = await getCategory(params.id) as CategoryWithDescription;
        setCategory(categoryData);

        // Set image if available
        if (categoryData.image) {
          setCategoryImage([categoryData.image]);
        }

        // Populate form with category data
        reset({
          name: categoryData.name,
          description: categoryData.description || '',
          parentId: categoryData.parentId || '',
        });

        // Fetch parent categories
        const categories = await getCategories();
        
        // Filter out categories that have a parentId to get only top-level categories
        // Also remove the current category to prevent self-reference
        const topLevelCategories = categories.filter(
          cat => !cat.parentId && cat.id !== params.id
        );
        setParentCategories(topLevelCategories);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch category data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, reset]);

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
      
      // Prepare update data
      const updateData: Record<string, any> = {
        name: data.name,
        slug,
      };
      
      // Only include description if it has a value
      if (data.description) {
        updateData.description = data.description;
      }
      
      // Handle parentId - empty string means remove the parent
      if (data.parentId) {
        updateData.parentId = data.parentId;
      } else if (category?.parentId) {
        // If we had a parentId before and now it's empty, we want to remove it
        updateData.parentId = '';
      }

      // Handle image - empty array means remove the image
      if (categoryImage.length > 0) {
        updateData.image = categoryImage[0];
      } else if (category?.image) {
        // If we had an image before and now it's empty, we want to remove it
        updateData.image = '';
      }
      
      console.log('Updating category with data:', updateData);
      
      // Submit to API
      const result = await updateCategory(params.id, updateData);
      console.log('Category updated successfully:', result);
      
      // Show success message
      toast.success('Category has been updated successfully.');
      
      // Redirect back to categories list
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Edit Category</h1>
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
              {category?.parentId && !parentCategories.some(pc => pc.id === category.parentId) && (
                <p className="mt-1 text-sm text-amber-600">
                  Note: The original parent category may not be available for selection.
                </p>
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
              {submitting ? 'Updating Category...' : 'Update Category'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 