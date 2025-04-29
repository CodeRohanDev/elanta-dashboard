'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiStoreLine,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiGlobalLine,
  RiFacebookLine,
  RiInstagramLine,
  RiTwitterLine,
  RiTimeLine,
  RiFileListLine,
  RiImageLine,
  RiSaveLine,
  RiSearchLine,
  RiLayoutBottomLine,
  RiStarLine
} from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { collection, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form validation schema
const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  facebook: z.string().url('Invalid Facebook URL').optional().or(z.literal('')),
  instagram: z.string().url('Invalid Instagram URL').optional().or(z.literal('')),
  twitter: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  businessHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }),
    tuesday: z.object({ open: z.string(), close: z.string() }),
    wednesday: z.object({ open: z.string(), close: z.string() }),
    thursday: z.object({ open: z.string(), close: z.string() }),
    friday: z.object({ open: z.string(), close: z.string() }),
    saturday: z.object({ open: z.string(), close: z.string() }),
    sunday: z.object({ open: z.string(), close: z.string() }),
  }),
  policies: z.object({
    shipping: z.string().min(10, 'Shipping policy must be at least 10 characters'),
    returns: z.string().min(10, 'Returns policy must be at least 10 characters'),
    privacy: z.string().min(10, 'Privacy policy must be at least 10 characters'),
  }),
  branding: z.object({
    logo: z.string().optional(),
    favicon: z.string().optional(),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code'),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color code'),
  }),
  seo: z.object({
    metaTitle: z.string().min(2, 'Meta title must be at least 2 characters'),
    metaDescription: z.string().min(10, 'Meta description must be at least 10 characters'),
    keywords: z.string().min(2, 'Keywords must be at least 2 characters'),
  }),
  footer: z.object({
    description: z.string().min(10, 'Footer description must be at least 10 characters'),
    copyright: z.string().min(2, 'Copyright text must be at least 2 characters'),
    quickLinks: z.object({
      aboutUs: z.string().min(2, 'About Us link must be at least 2 characters'),
      contact: z.string().min(2, 'Contact link must be at least 2 characters'),
      shipping: z.string().min(2, 'Shipping link must be at least 2 characters'),
      returns: z.string().min(2, 'Returns link must be at least 2 characters'),
      privacyPolicy: z.string().min(2, 'Privacy Policy link must be at least 2 characters'),
      termsOfService: z.string().min(2, 'Terms of Service link must be at least 2 characters'),
    }),
  }),
  newsletter: z.object({
    title: z.string().min(2, 'Newsletter title must be at least 2 characters'),
    description: z.string().min(10, 'Newsletter description must be at least 10 characters'),
    enabled: z.boolean(),
  }),
  socialProof: z.object({
    trustBadges: z.object({
      securePayment: z.boolean(),
      moneyBackGuarantee: z.boolean(),
      freeShipping: z.boolean(),
      twentyFourSevenSupport: z.boolean(),
    }),
    reviewsTitle: z.string().min(2, 'Reviews title must be at least 2 characters'),
  }),
});

type StoreFormData = z.infer<typeof storeSchema>;

interface BusinessHours {
  open: string;
  close: string;
}

interface StorePolicies {
  shipping: string;
  returns: string;
  privacy: string;
}

interface StoreBranding {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface StoreData {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  businessHours: {
    [key: string]: BusinessHours;
  };
  policies: StorePolicies;
  branding: StoreBranding;
}

export default function StoreProfilePage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      description: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      facebook: '',
      instagram: '',
      twitter: '',
      businessHours: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '10:00', close: '15:00' },
        sunday: { open: '', close: '' },
      },
      policies: {
        shipping: '',
        returns: '',
        privacy: '',
      },
      branding: {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
      },
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: '',
      },
      footer: {
        description: '',
        copyright: '',
        quickLinks: {
          aboutUs: '',
          contact: '',
          shipping: '',
          returns: '',
          privacyPolicy: '',
          termsOfService: '',
        },
      },
      newsletter: {
        title: '',
        description: '',
        enabled: false,
      },
      socialProof: {
        trustBadges: {
          securePayment: false,
          moneyBackGuarantee: false,
          freeShipping: false,
          twentyFourSevenSupport: false,
        },
        reviewsTitle: '',
      },
    },
  });

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      if (!userData?.storeId) {
        toast.error('Store ID not found');
        return;
      }
      
      const storeRef = doc(db, 'stores', userData.storeId);
      const storeDoc = await getDoc(storeRef);

      if (storeDoc.exists()) {
        const data = storeDoc.data() as StoreData;
        reset(data);
        setLogoPreview(data.branding.logo || null);
        setFaviconPreview(data.branding.favicon || null);
      } else {
        // Create initial store data if it doesn't exist
        const initialData: StoreData = {
          name: '',
          description: '',
          email: '',
          phone: '',
          address: '',
          businessHours: {
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: { open: '10:00', close: '15:00' },
            sunday: { open: '', close: '' },
          },
          policies: {
            shipping: '',
            returns: '',
            privacy: '',
          },
          branding: {
            primaryColor: '#000000',
            secondaryColor: '#ffffff',
          },
        };
        
        await setDoc(storeRef, initialData);
        reset(initialData);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
      toast.error('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
    try {
      // Here you would typically upload the image to your storage service
      // For now, we'll just create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === 'logo') {
          setLogoPreview(result);
          setValue('branding.logo', result);
        } else {
          setFaviconPreview(result);
          setValue('branding.favicon', result);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const onSubmit = async (data: StoreFormData) => {
    try {
      if (!userData?.storeId) {
        toast.error('Store ID not found');
        return;
      }

      setSaving(true);
      const storeRef = doc(db, 'stores', userData.storeId);
      await updateDoc(storeRef, data);
      toast.success('Store profile updated successfully');
    } catch (error) {
      console.error('Error updating store data:', error);
      toast.error('Failed to update store profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading store profile...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Store Settings</h1>
          <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
            <RiSaveLine className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiStoreLine className="h-5 w-5" />
                    Store Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Store Name</label>
                    <Input {...register('name')} />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea {...register('description')} />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiTimeLine className="h-5 w-5" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    const dayKey = day as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
                    return (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-24">
                          <label className="block text-sm font-medium mb-1 capitalize">{day}</label>
                        </div>
                        <div className="flex-1 flex gap-4">
                          <div className="flex-1">
                            <Input
                              type="time"
                              {...register(`businessHours.${dayKey}.open`)}
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              type="time"
                              {...register(`businessHours.${dayKey}.close`)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Settings Tab */}
            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiMailLine className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input {...register('email')} />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input {...register('phone')} />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <Textarea {...register('address')} />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiGlobalLine className="h-5 w-5" />
                    Social Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <Input {...register('website')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Facebook</label>
                    <Input {...register('facebook')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Instagram</label>
                    <Input {...register('instagram')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Twitter</label>
                    <Input {...register('twitter')} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Website Settings Tab */}
            <TabsContent value="website" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiSearchLine className="h-5 w-5" />
                    SEO Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Meta Title</label>
                    <Input {...register('seo.metaTitle')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Meta Description</label>
                    <Textarea {...register('seo.metaDescription')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Keywords (comma separated)</label>
                    <Input {...register('seo.keywords')} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiLayoutBottomLine className="h-5 w-5" />
                    Footer Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Footer Description</label>
                    <Textarea {...register('footer.description')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Copyright Text</label>
                    <Input {...register('footer.copyright')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quick Links</label>
                    <div className="space-y-2">
                      {[
                        { key: 'aboutUs' as const, label: 'About Us' },
                        { key: 'contact' as const, label: 'Contact' },
                        { key: 'shipping' as const, label: 'Shipping' },
                        { key: 'returns' as const, label: 'Returns' },
                        { key: 'privacyPolicy' as const, label: 'Privacy Policy' },
                        { key: 'termsOfService' as const, label: 'Terms of Service' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Input {...register(`footer.quickLinks.${key}`)} placeholder={label} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiMailLine className="h-5 w-5" />
                    Newsletter Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Newsletter Title</label>
                    <Input {...register('newsletter.title')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Newsletter Description</label>
                    <Textarea {...register('newsletter.description')} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch {...register('newsletter.enabled')} />
                    <label className="text-sm font-medium">Enable Newsletter Subscription</label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiStarLine className="h-5 w-5" />
                    Social Proof
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Trust Badges</label>
                    <div className="space-y-2">
                      {[
                        { key: 'securePayment' as const, label: 'Secure Payment' },
                        { key: 'moneyBackGuarantee' as const, label: 'Money Back Guarantee' },
                        { key: 'freeShipping' as const, label: 'Free Shipping' },
                        { key: 'twentyFourSevenSupport' as const, label: '24/7 Support' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Switch {...register(`socialProof.trustBadges.${key}`)} />
                          <label className="text-sm">{label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Reviews Section Title</label>
                    <Input {...register('socialProof.reviewsTitle')} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiFileListLine className="h-5 w-5" />
                    Store Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Shipping Policy</label>
                    <Textarea {...register('policies.shipping')} />
                    {errors.policies?.shipping && (
                      <p className="text-red-500 text-sm mt-1">{errors.policies.shipping.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Returns Policy</label>
                    <Textarea {...register('policies.returns')} />
                    {errors.policies?.returns && (
                      <p className="text-red-500 text-sm mt-1">{errors.policies.returns.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Privacy Policy</label>
                    <Textarea {...register('policies.privacy')} />
                    {errors.policies?.privacy && (
                      <p className="text-red-500 text-sm mt-1">{errors.policies.privacy.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RiImageLine className="h-5 w-5" />
                    Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Logo</label>
                    <div className="flex items-center gap-4">
                      {logoPreview && (
                        <div className="relative w-20 h-20">
                          <Image
                            src={logoPreview}
                            alt="Store Logo"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'logo');
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Favicon</label>
                    <div className="flex items-center gap-4">
                      {faviconPreview && (
                        <div className="relative w-8 h-8">
                          <Image
                            src={faviconPreview}
                            alt="Store Favicon"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'favicon');
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Primary Color</label>
                    <div className="flex gap-4">
                      <Input
                        type="color"
                        {...register('branding.primaryColor')}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        type="text"
                        {...register('branding.primaryColor')}
                        className="flex-1"
                      />
                    </div>
                    {errors.branding?.primaryColor && (
                      <p className="text-red-500 text-sm mt-1">{errors.branding.primaryColor.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Color</label>
                    <div className="flex gap-4">
                      <Input
                        type="color"
                        {...register('branding.secondaryColor')}
                        className="w-20 h-10 p-1"
                      />
                      <Input
                        type="text"
                        {...register('branding.secondaryColor')}
                        className="flex-1"
                      />
                    </div>
                    {errors.branding?.secondaryColor && (
                      <p className="text-red-500 text-sm mt-1">{errors.branding.secondaryColor.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 