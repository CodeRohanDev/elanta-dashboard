'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RiStore2Line, RiImageAddLine } from 'react-icons/ri';

interface StoreProfile {
  storeName: string;
  storeDescription: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeWebsite?: string;
  storeLogo?: string;
  storeBanner?: string;
}

export default function StoreProfilePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({
    storeName: '',
    storeDescription: '',
    storeAddress: '',
    storePhone: '',
    storeEmail: '',
    storeWebsite: '',
  });

  useEffect(() => {
    // Redirect if not vendor
    if (userData && userData.role !== 'vendor') {
      router.push('/dashboard');
      return;
    }

    async function fetchStoreProfile() {
      if (userData?.id) {
        try {
          const storeDoc = await getDoc(doc(db, 'stores', userData.id));
          if (storeDoc.exists()) {
            setStoreProfile(storeDoc.data() as StoreProfile);
          }
        } catch (error) {
          console.error('Error fetching store profile:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    if (userData?.role === 'vendor') {
      fetchStoreProfile();
    }
  }, [userData, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'stores', userData.id), storeProfile);
      alert('Store profile updated successfully');
    } catch (error) {
      console.error('Error updating store profile:', error);
      alert('Error updating store profile');
    } finally {
      setSaving(false);
    }
  };

  if (userData && userData.role !== 'vendor') {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <p>Loading store profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Profile</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Store Banner */}
          <div className="relative h-48 bg-gray-200">
            {storeProfile.storeBanner ? (
              <img
                src={storeProfile.storeBanner}
                alt="Store banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <button className="flex items-center space-x-2 text-gray-500 hover:text-gray-700">
                  <RiImageAddLine className="h-6 w-6" />
                  <span>Add Banner Image</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Store Logo */}
          <div className="relative mt-[-3rem] ml-6">
            <div className="inline-block h-24 w-24 rounded-full ring-4 ring-white bg-gray-200 overflow-hidden">
              {storeProfile.storeLogo ? (
                <img
                  src={storeProfile.storeLogo}
                  alt="Store logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <RiStore2Line className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          {/* Store Info Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                  Store Name *
                </label>
                <input
                  type="text"
                  id="storeName"
                  name="storeName"
                  value={storeProfile.storeName}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700">
                  Store Description *
                </label>
                <textarea
                  id="storeDescription"
                  name="storeDescription"
                  rows={4}
                  value={storeProfile.storeDescription}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="storeEmail" className="block text-sm font-medium text-gray-700">
                    Store Email
                  </label>
                  <input
                    type="email"
                    id="storeEmail"
                    name="storeEmail"
                    value={storeProfile.storeEmail || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="storePhone" className="block text-sm font-medium text-gray-700">
                    Store Phone
                  </label>
                  <input
                    type="tel"
                    id="storePhone"
                    name="storePhone"
                    value={storeProfile.storePhone || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">
                  Store Address
                </label>
                <input
                  type="text"
                  id="storeAddress"
                  name="storeAddress"
                  value={storeProfile.storeAddress || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="storeWebsite" className="block text-sm font-medium text-gray-700">
                  Store Website
                </label>
                <input
                  type="url"
                  id="storeWebsite"
                  name="storeWebsite"
                  value={storeProfile.storeWebsite || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Store Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 