'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { RiUserSettingsLine, RiLockPasswordLine, RiNotification3Line, RiStore2Line } from 'react-icons/ri';

export default function SettingsPage() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile Settings', icon: RiUserSettingsLine },
    { id: 'security', name: 'Security', icon: RiLockPasswordLine },
    { id: 'notifications', name: 'Notifications', icon: RiNotification3Line },
  ];

  // Add store settings tab for vendors
  if (userData?.role === 'vendor') {
    tabs.push({ id: 'store', name: 'Store Settings', icon: RiStore2Line });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-medium text-card-foreground">Settings</h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <tab.icon className="mr-3 h-5 w-5" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-card rounded-lg shadow p-6">
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-medium text-card-foreground mb-6">Profile Settings</h3>
                  <form className="space-y-6">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        defaultValue={userData?.displayName}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        defaultValue={userData?.email}
                        disabled
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h3 className="text-lg font-medium text-card-foreground mb-6">Security Settings</h3>
                  <form className="space-y-6">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-muted-foreground">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-lg font-medium text-card-foreground mb-6">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive email notifications for new orders and updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-foreground">Order Updates</h4>
                        <p className="text-sm text-muted-foreground">Receive notifications when order status changes</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'store' && userData?.role === 'vendor' && (
                <div>
                  <h3 className="text-lg font-medium text-card-foreground mb-6">Store Settings</h3>
                  <form className="space-y-6">
                    <div>
                      <label htmlFor="storeName" className="block text-sm font-medium text-muted-foreground">
                        Store Name
                      </label>
                      <input
                        type="text"
                        id="storeName"
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="storeDescription" className="block text-sm font-medium text-muted-foreground">
                        Store Description
                      </label>
                      <textarea
                        id="storeDescription"
                        rows={4}
                        className="mt-1 block w-full rounded-md border-border bg-background shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      ></textarea>
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Save Store Settings
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 