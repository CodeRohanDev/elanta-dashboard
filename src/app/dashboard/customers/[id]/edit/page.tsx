'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User } from '@/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { 
  RiArrowGoBackLine,
  RiUserLine,
  RiMailLine,
  RiSaveLine
} from 'react-icons/ri';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const userSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'customer']),
  isActive: z.boolean()
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditCustomerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema)
  });

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const customerDoc = await getDoc(doc(db, 'users', id as string));
      
      if (!customerDoc.exists()) {
        toast({
          id: 'customer-not-found',
          title: "Error",
          description: "Customer not found",
          variant: "destructive"
        });
        router.push('/dashboard/customers');
        return;
      }

      const customerData = customerDoc.data() as User;
      reset({
        displayName: customerData.displayName || '',
        email: customerData.email,
        role: customerData.role || 'customer',
        isActive: customerData.isActive ?? true
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        id: 'fetch-error',
        title: "Error",
        description: "Failed to fetch customer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', id as string), {
        ...data,
        updatedAt: new Date().toISOString()
      });

      toast({
        id: 'update-success',
        title: "Success",
        description: "Customer updated successfully",
        variant: "default"
      });

      router.push(`/dashboard/customers/${id}`);
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        id: 'update-error',
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edit Customer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer ID: {id}
            </p>
          </div>
          <Link
            href={`/dashboard/customers/${id}`}
            className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/80"
          >
            <RiArrowGoBackLine className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
                
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                    Name
                  </label>
                  <div className="mt-1">
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <RiUserLine className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        type="text"
                        id="displayName"
                        className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Customer name"
                        {...register('displayName')}
                      />
                    </div>
                    {errors.displayName && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.displayName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="mt-1">
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <RiMailLine className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Customer email"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Account Settings</h2>
                
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-foreground">
                    Role
                  </label>
                  <select
                    id="role"
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    {...register('role')}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    {...register('isActive')}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-foreground">
                    Account Active
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RiSaveLine className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 