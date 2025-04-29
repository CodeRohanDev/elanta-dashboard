'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category, Product } from '@/types';
import { RiCloseLine, RiAddLine, RiImageLine, RiCheckLine } from 'react-icons/ri';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ImageUploader from '@/components/ui/ImageUploader';
import { toast } from '@/components/ui/use-toast';
import { Dialog, Transition } from '@headlessui/react';
import { use } from 'react';

// Form validation schema
const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  discountPrice: z.number().nonnegative('Discount price cannot be negative').optional(),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  stock: z.number().int().nonnegative('Stock must be 0 or greater'),
  features: z.array(z.string()).optional(),
  specifications: z.record(z.string()).optional(),
  isFeatured: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const productId = use(params).id;
  
  const router = useRouter();
  const { userData, currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  
  // Variations state
  const [variationTypes, setVariationTypes] = useState<Array<{name: string, options: string[]}>>([]);
  const [newVariationType, setNewVariationType] = useState('');
  const [newVariationOption, setNewVariationOption] = useState('');
  const [activeVariationIndex, setActiveVariationIndex] = useState<number | null>(null);
  const [variations, setVariations] = useState<Array<{
    combination: Record<string, string>,
    price: number,
    stock: number,
    sku: string,
    images: string[]
  }>>([]);

  const [currentVariationIndex, setCurrentVariationIndex] = useState<number | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [useMainImages, setUseMainImages] = useState(true);
  const [variationImages, setVariationImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
    watch,
    reset
  } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      features: [],
      specifications: {},
    }
  });

  const features = watch('features') || [];
  const specifications = watch('specifications') || {};
  const selectedCategory = watch('category');

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'categories'));
        
        // First, create a map of all categories
        const allCategories: Record<string, Category> = {};
        querySnapshot.docs.forEach(doc => {
          const categoryData = doc.data() as Category;
          allCategories[doc.id] = {
            ...categoryData,
            id: doc.id,
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
        
        // Extract top-level categories for the state
        const topLevelCategories = Object.values(allCategories).filter(cat => !cat.parentId);
        setCategories(topLevelCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Fetch product data after categories are loaded
  useEffect(() => {
    async function fetchProduct() {
      if (loading) return; // Wait for categories to load first
      
      try {
        setProductLoading(true);
        const productDoc = await getDoc(doc(db, 'products', productId));
        
        if (!productDoc.exists()) {
          toast({
            id: 'product-not-found',
            title: 'Error',
            description: 'Product not found',
            variant: 'destructive',
          });
          router.push('/dashboard/products');
          return;
        }
        
        const productData = productDoc.data() as Product;
        
        // Reset the form with the product data
        reset({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          discountPrice: productData.discountPrice || 0,
          category: productData.category,
          subcategory: productData.subcategory || '',
          stock: productData.stock,
          features: productData.features || [],
          specifications: productData.specifications || {},
          isFeatured: productData.isFeatured,
        });
        
        // Set images
        setImages(productData.images || []);
        
        // Set variations if they exist
        if (productData.hasVariations && productData.variationTypes) {
          setVariationTypes(productData.variationTypes);
          setVariations(productData.variations || []);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast({
          id: 'product-load-error',
          title: 'Error',
          description: 'Failed to load product data',
          variant: 'destructive',
        });
      } finally {
        setProductLoading(false);
      }
    }

    fetchProduct();
  }, [productId, router, reset, loading]); // Add loading as dependency

  const addFeature = () => {
    if (featureInput.trim() === '') return;
    
    const currentFeatures = watch('features') || [];
    setValue('features', [...currentFeatures, featureInput]);
    setFeatureInput('');
  };

  const removeFeature = (index: number) => {
    const currentFeatures = [...features];
    currentFeatures.splice(index, 1);
    setValue('features', currentFeatures);
  };

  const addSpecification = () => {
    if (specKey.trim() === '' || specValue.trim() === '') return;
    
    const currentSpecs = { ...specifications };
    currentSpecs[specKey] = specValue;
    setValue('specifications', currentSpecs);
    
    setSpecKey('');
    setSpecValue('');
  };

  const removeSpecification = (key: string) => {
    const currentSpecs = { ...specifications };
    delete currentSpecs[key];
    setValue('specifications', currentSpecs);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setSubmitting(true);
      setFormError('');

      // Validate images
      if (images.length === 0) {
        setFormError('At least one product image is required');
        setSubmitting(false);
        return;
      }

      // Check if variations are set up but not completed
      if (variationTypes.length > 0 && variations.length === 0) {
        setFormError('You have defined variation types but not created any variations. Please add variations or remove variation types.');
        setSubmitting(false);
        return;
      }

      // Prepare product data
      const productData = {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock),
        discountPrice: data.discountPrice ? Number(data.discountPrice) : null,
        images: images,
        features: features.filter(f => f.trim() !== ''),
        specifications,
        hasVariations: variations.length > 0,
        variationTypes: variationTypes,
        variations: variations,
        updatedAt: serverTimestamp(),
        updatedBy: {
          uid: currentUser?.uid || 'unknown',
          email: currentUser?.email || 'unknown',
        },
        isFeatured: data.isFeatured,
      };

      // Update in Firestore
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, productData);
      
      // Show success and redirect
      toast({
        id: 'product-updated',
        title: 'Success!',
        description: 'Product has been updated successfully.',
        variant: 'success',
      });
      
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Error updating product:', error);
      setFormError('Failed to update product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add variation type (e.g. "Color", "Size")
  const addVariationType = () => {
    if (newVariationType.trim() === '') return;
    
    setVariationTypes([...variationTypes, { name: newVariationType, options: [] }]);
    setNewVariationType('');
    setActiveVariationIndex(variationTypes.length);
  };

  // Remove variation type
  const removeVariationType = (index: number) => {
    const updatedTypes = [...variationTypes];
    updatedTypes.splice(index, 1);
    setVariationTypes(updatedTypes);
    
    if (activeVariationIndex === index) {
      setActiveVariationIndex(null);
    } else if (activeVariationIndex !== null && activeVariationIndex > index) {
      setActiveVariationIndex(activeVariationIndex - 1);
    }
    
    // Remove variations that use this type
    if (variations.length > 0) {
      const typeName = variationTypes[index].name;
      const filteredVariations = variations.filter(v => !Object.keys(v.combination).includes(typeName));
      setVariations(filteredVariations);
    }
  };

  // Add option to a variation type (e.g. "Red" to "Color")
  const addVariationOption = () => {
    if (activeVariationIndex === null || newVariationOption.trim() === '') return;
    
    const updatedTypes = [...variationTypes];
    updatedTypes[activeVariationIndex].options = [
      ...updatedTypes[activeVariationIndex].options,
      newVariationOption
    ];
    
    setVariationTypes(updatedTypes);
    setNewVariationOption('');
  };

  // Remove option from a variation type
  const removeVariationOption = (typeIndex: number, optionIndex: number) => {
    const updatedTypes = [...variationTypes];
    const typeName = updatedTypes[typeIndex].name;
    const optionValue = updatedTypes[typeIndex].options[optionIndex];
    
    updatedTypes[typeIndex].options.splice(optionIndex, 1);
    setVariationTypes(updatedTypes);
    
    // Remove variations that use this option
    if (variations.length > 0) {
      const filteredVariations = variations.filter(
        v => v.combination[typeName] !== optionValue
      );
      setVariations(filteredVariations);
    }
  };

  // Handle variation images
  const handleVariationImages = (index: number) => {
    setCurrentVariationIndex(index);
    const variation = variations[index];
    setVariationImages(variation.images || []);
    setUseMainImages(variation.images?.length === 0 || 
      (images.length > 0 && variation.images?.length === images.length && 
       variation.images?.every(img => images.includes(img))));
    setImageModalOpen(true);
  };
  
  const saveVariationImages = () => {
    if (currentVariationIndex === null) return;
    
    const updatedVariations = [...variations];
    updatedVariations[currentVariationIndex] = {
      ...updatedVariations[currentVariationIndex],
      images: useMainImages ? [...images] : variationImages
    };
    
    setVariations(updatedVariations);
    setImageModalOpen(false);
  };

  // Create variation entries for each combination
  const generateCombinations = (
    types: Array<{name: string, options: string[]}>,
    current: Record<string, string> = {},
    index: number = 0,
    result: Array<Record<string, string>> = []
  ): Array<Record<string, string>> => {
    if (index === types.length) {
      result.push({...current});
      return result;
    }
    
    const type = types[index];
    for (const option of type.options) {
      current[type.name] = option;
      generateCombinations(types, current, index + 1, result);
    }
    
    return result;
  };
  
  // Generate all possible combinations of options
  const generateVariations = () => {
    if (variationTypes.length === 0 || variationTypes.some(vt => vt.options.length === 0)) {
      setFormError('Please add variation types and options before generating variations');
      return;
    }
    
    const combinations = generateCombinations(variationTypes);
    
    // Create variation entries for each combination
    const basePrice = watch('price') || 0;
    const baseStock = watch('stock') || 0;
    
    // Keep existing variation data if it exists
    const newVariations = combinations.map(combo => {
      // Check if this combination already exists
      const existing = variations.find(v => {
        return Object.keys(combo).every(key => v.combination[key] === combo[key]);
      });
      
      if (existing) {
        return existing;
      }
      
      // Generate a SKU based on product name and variation
      const productName = watch('name') || 'PROD';
      const skuSegments = Object.values(combo).map(v => v.substring(0, 3).toUpperCase());
      const sku = `${productName.substring(0, 4).toUpperCase()}-${skuSegments.join('-')}`;
      
      return {
        combination: combo,
        price: basePrice,
        stock: baseStock,
        sku: sku,
        images: [...images] // Default to using the main product images
      };
    });
    
    setVariations(newVariations);
  };

  // Update a specific variation
  const updateVariation = (index: number, field: string, value: any) => {
    const updatedVariations = [...variations];
    updatedVariations[index] = { 
      ...updatedVariations[index], 
      [field]: field === 'price' || field === 'stock' ? Number(value) : value 
    };
    setVariations(updatedVariations);
  };

  // Delete a specific variation
  const removeVariation = (index: number) => {
    const updatedVariations = [...variations];
    updatedVariations.splice(index, 1);
    setVariations(updatedVariations);
  };

  // Fix the subcategories check
  const getSelectedCategory = () => {
    if (!selectedCategory) return null;
    return categories.find(cat => cat.id === selectedCategory);
  };

  if (productLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-card hover:bg-secondary"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card shadow rounded-lg p-6">
          {formError && (
            <div className="rounded-md bg-destructive/10 p-4">
              <div className="text-sm text-destructive">{formError}</div>
            </div>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-medium text-card-foreground">Basic Information</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  id="name"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('name', { required: true })}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-destructive">{formErrors.name.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-foreground mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="price"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('price', { 
                      required: true,
                      valueAsNumber: true,
                    })}
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-sm text-destructive">{formErrors.price.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="discountPrice" className="block text-sm font-medium text-foreground mb-1">
                    Discount Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="discountPrice"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('discountPrice', { 
                      valueAsNumber: true,
                    })}
                  />
                  {formErrors.discountPrice && (
                    <p className="mt-1 text-sm text-destructive">{formErrors.discountPrice.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-foreground mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  id="stock"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('stock', { 
                    required: true,
                    valueAsNumber: true,
                  })}
                />
                {formErrors.stock && (
                  <p className="mt-1 text-sm text-destructive">{formErrors.stock.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="isFeatured" className="block text-sm font-medium text-foreground mb-1">
                  Featured Product
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    {...register('isFeatured')}
                  />
                  <span className="text-sm text-muted-foreground">Mark this product as featured</span>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                Description *
              </label>
              <textarea
                id="description"
                rows={4}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('description', { required: true })}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-destructive">{formErrors.description.message}</p>
              )}
            </div>
          </div>

          {/* Category Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-medium text-card-foreground">Categories</h2>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-foreground mb-1">
                Category *
              </label>
              <select
                id="category"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('category', { required: true })}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {formErrors.category && (
                <p className="mt-1 text-sm text-destructive">{formErrors.category.message}</p>
              )}
            </div>

            {getSelectedCategory() && getSelectedCategory()?.subcategories && getSelectedCategory()?.subcategories?.length > 0 && (
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-foreground mb-1">
                  Subcategory (Optional)
                </label>
                <select
                  id="subcategory"
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('subcategory')}
                >
                  <option value="">Select a subcategory</option>
                  {categories
                    .find(cat => cat.id === selectedCategory)
                    ?.subcategories?.map((subcat) => (
                      <option key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-medium text-card-foreground">Product Images</h2>
            <ImageUploader 
              images={images} 
              setImages={setImages} 
              error={errors.images}
            />
          </div>

          {/* Features Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-medium text-card-foreground">Features</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                placeholder="Add a feature..."
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Add
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                  >
                    <RiCloseLine className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Specifications Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-medium text-card-foreground">Specifications</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder="Name (e.g. 'Color')"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                type="text"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                placeholder="Value (e.g. 'Red')"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={addSpecification}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Add
              </button>
            </div>
            
            {Object.keys(specifications).length > 0 && (
              <div className="mt-4 border border-border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-secondary">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {Object.entries(specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => removeSpecification(key)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Variations Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-medium text-card-foreground">Product Variations (Optional)</h2>
            <p className="text-sm text-muted-foreground">Define variations such as colors, sizes, or other attributes.</p>
            
            {/* Add Variation Type */}
            <div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Variation type (e.g. Color, Size)"
                  value={newVariationType}
                  onChange={(e) => setNewVariationType(e.target.value)}
                />
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90"
                  onClick={addVariationType}
                >
                  Add Type
                </button>
              </div>
            </div>
            
            {/* Variation Types */}
            {variationTypes.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Variation Types List */}
                <div className="col-span-1 border border-border rounded-md p-4 bg-card">
                  <h3 className="font-medium text-foreground mb-2">Variation Types</h3>
                  <ul className="space-y-2">
                    {variationTypes.map((type, index) => (
                      <li 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                          activeVariationIndex === index ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        }`}
                        onClick={() => setActiveVariationIndex(index)}
                      >
                        <span className="text-foreground">{type.name} ({type.options.length})</span>
                        <button
                          type="button"
                          className="text-destructive hover:text-destructive/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVariationType(index);
                          }}
                        >
                          <RiCloseLine className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Variation Options */}
                <div className="col-span-2 border border-border rounded-md p-4 bg-card">
                  {activeVariationIndex !== null && activeVariationIndex < variationTypes.length ? (
                    <>
                      <h3 className="font-medium text-foreground mb-2">
                        Options for {variationTypes[activeVariationIndex].name}
                      </h3>
                      
                      <div className="flex space-x-2 mb-4">
                        <input
                          type="text"
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder="Option value (e.g. Red, XL)"
                          value={newVariationOption}
                          onChange={(e) => setNewVariationOption(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariationOption())}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90"
                          onClick={addVariationOption}
                        >
                          Add Option
                        </button>
                      </div>
                      
                      {variationTypes[activeVariationIndex].options.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {variationTypes[activeVariationIndex].options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center space-x-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                              <span>{option}</span>
                              <button
                                type="button"
                                onClick={() => removeVariationOption(activeVariationIndex, optIndex)}
                                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                              >
                                <RiCloseLine className="h-3 w-3" />
                                <span className="sr-only">Remove</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No options added yet.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a variation type to add options.</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Generate Variations Button */}
            {variationTypes.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-foreground bg-secondary hover:bg-secondary/80"
                  onClick={generateVariations}
                >
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Generate Variations
                </button>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will create all possible combinations of your variation options.
                </p>
              </div>
            )}
            
            {/* Variations Table */}
            {variations.length > 0 && (
              <div className="mt-4 border border-border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-secondary">
                    <tr>
                      {variationTypes.map((type, index) => (
                        <th key={index} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {type.name}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Images
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {variations.map((variation, index) => (
                      <tr key={index}>
                        {variationTypes.map((type, typeIndex) => (
                          <td key={typeIndex} className="px-3 py-2 whitespace-nowrap text-sm text-foreground">
                            {variation.combination[type.name]}
                          </td>
                        ))}
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            value={variation.price}
                            onChange={(e) => updateVariation(index, 'price', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            value={variation.stock}
                            onChange={(e) => updateVariation(index, 'stock', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <input
                            type="text"
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground"
                            value={variation.sku}
                            onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-input text-foreground bg-background hover:bg-secondary"
                            onClick={() => handleVariationImages(index)}
                          >
                            {variation.images.length === 0 ? "Add Images" : `${variation.images.length} Image${variation.images.length > 1 ? 's' : ''}`}
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-right">
                          <button
                            type="button"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => removeVariation(index)}
                          >
                            <RiCloseLine className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-primary/70 disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>

      {/* Variation Image Modal */}
      <Transition appear show={imageModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setImageModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-card p-6 text-left align-middle shadow-xl transition-all border border-border">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground mb-4"
                  >
                    Variation Images
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="use-main-images"
                        checked={useMainImages}
                        onChange={(e) => setUseMainImages(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="use-main-images" className="text-sm font-medium text-foreground">
                        Use same images as main product
                      </label>
                    </div>
                    
                    {!useMainImages && (
                      <div className="mt-4">
                        <ImageUploader
                          images={variationImages}
                          setImages={setVariationImages}
                        />
                      </div>
                    )}
                    
                    {useMainImages && images.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Main product images that will be used:</p>
                        <div className="grid grid-cols-3 gap-4">
                          {images.map((image, idx) => (
                            <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-border">
                              <img src={image} alt="Product" className="object-cover w-full h-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-secondary"
                      onClick={() => setImageModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
                      onClick={saveVariationImages}
                    >
                      <RiCheckLine className="mr-2 h-4 w-4" />
                      Save Images
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </DashboardLayout>
  );
} 