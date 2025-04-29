'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { 
  getCurrencies, 
  addCurrency, 
  updateCurrency, 
  deleteCurrency,
  getCommonCurrencies,
  updateAllExchangeRates,
  getBaseCurrencyCode,
  fetchExchangeRates
} from '@/lib/currencyUtils';
import { Currency } from '@/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiPencilLine,
  RiDeleteBinLine,
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiRefreshLine,
  RiAlertLine,
  RiMoneyDollarCircleLine,
  RiEditLine
} from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Form validation schemas
const currencySchema = z.object({
  code: z.string().length(3, 'Currency code must be exactly 3 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  symbol: z.string().min(1, 'Symbol is required'),
  rate: z.number().positive('Rate must be a positive number'),
  decimals: z.number().int().min(0).max(4, 'Maximum 4 decimal places'),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

const taxRateSchema = z.object({
  country: z.string().min(2, 'Country is required'),
  state: z.string().optional(),
  rate: z.number().min(0).max(100, 'Rate must be between 0 and 100'),
  isActive: z.boolean(),
});

type CurrencyFormData = z.infer<typeof currencySchema>;
type TaxRateFormData = z.infer<typeof taxRateSchema>;

interface TaxRate {
  id: string;
  country: string;
  state?: string;
  rate: number;
  isActive: boolean;
  createdAt?: string;
}

export default function CurrencyTaxSettings() {
  const router = useRouter();
  const { userData } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCurrencyForm, setShowCurrencyForm] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [showCommonCurrencies, setShowCommonCurrencies] = useState(false);
  const [commonCurrencies, setCommonCurrencies] = useState<any[]>([]);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updatingRates, setUpdatingRates] = useState(false);
  
  const {
    register: registerCurrency,
    handleSubmit: handleCurrencySubmit,
    reset: resetCurrency,
    setValue: setCurrencyValue,
    formState: { errors: currencyErrors },
  } = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: '',
      name: '',
      symbol: '',
      rate: 1,
      decimals: 2,
      isDefault: false,
      isActive: true,
    }
  });

  const {
    register: registerTax,
    handleSubmit: handleTaxSubmit,
    reset: resetTax,
    formState: { errors: taxErrors },
  } = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      country: '',
      state: '',
      rate: 0,
      isActive: true,
    }
  });

  // Fetch currencies and tax rates on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch currencies
      const currenciesRef = collection(db, 'currencies');
      const currenciesSnapshot = await getDocs(currenciesRef);
      const currenciesData = currenciesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Currency[];
      setCurrencies(currenciesData);

      // Fetch tax rates
      const taxRatesRef = collection(db, 'taxRates');
      const taxRatesSnapshot = await getDocs(taxRatesRef);
      const taxRatesData = taxRatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaxRate[];
      setTaxRates(taxRatesData);

      // Get common currencies
      setCommonCurrencies(getCommonCurrencies());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrency = () => {
    setEditingCurrency(null);
    resetCurrency();
    setShowCurrencyForm(true);
  };

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    resetCurrency({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      rate: currency.rate,
      decimals: currency.decimals,
      isDefault: currency.isDefault,
      isActive: currency.isActive,
    });
    setShowCurrencyForm(true);
  };

  const handleDeleteCurrency = async (currency: Currency) => {
    if (currency.isDefault) {
      toast.error('Cannot delete the default currency. Please set another currency as default first.');
      return;
    }

    // Check if currency is in use
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('currency', '==', currency.code));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        toast.error('Cannot delete currency as it is being used in orders');
        return;
      }
    } catch (error) {
      console.error('Error checking currency usage:', error);
      toast.error('Failed to verify currency usage');
      return;
    }
    
    setDeletingCurrency(currency);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCurrency) return;
    
    try {
      await deleteCurrency(deletingCurrency.id);
      setCurrencies(currencies.filter(c => c.id !== deletingCurrency.id));
      toast.success('Currency deleted successfully');
    } catch (error) {
      console.error('Error deleting currency:', error);
      toast.error('Failed to delete currency');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingCurrency(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingCurrency(null);
  };

  const onSubmitCurrency = async (data: CurrencyFormData) => {
    try {
      // Validate if this is the first currency being set as default
      if (data.isDefault && currencies.length > 0 && !editingCurrency) {
        const hasDefault = currencies.some(c => c.isDefault);
        if (hasDefault) {
          toast.error('There is already a default currency. Please unset the existing default first.');
          return;
        }
      }

      // Validate currency code uniqueness
      const isCodeUnique = currencies.every(c => 
        c.code.toLowerCase() !== data.code.toLowerCase() || 
        (editingCurrency && c.id === editingCurrency.id)
      );
      if (!isCodeUnique) {
        toast.error('Currency code must be unique');
        return;
      }

      if (editingCurrency) {
        // Update existing currency
        await updateCurrency(editingCurrency.id, data);
        
        // If this is now the default currency, update other currencies
        if (data.isDefault) {
          const otherCurrencies = currencies.filter(c => c.id !== editingCurrency.id);
          await Promise.all(
            otherCurrencies.map(c => 
              updateCurrency(c.id, { ...c, isDefault: false })
            )
          );
        }
        
        setCurrencies(currencies.map(c => 
          c.id === editingCurrency.id ? { ...c, ...data } : 
          data.isDefault ? { ...c, isDefault: false } : c
        ));
        toast.success('Currency updated successfully');
      } else {
        // Add new currency
        const newCurrencyId = await addCurrency(data);
        
        // If this is the default currency, update other currencies
        if (data.isDefault) {
          await Promise.all(
            currencies.map(c => 
              updateCurrency(c.id, { ...c, isDefault: false })
            )
          );
        }
        
        setCurrencies([
          ...currencies.map(c => data.isDefault ? { ...c, isDefault: false } : c),
          { id: newCurrencyId, ...data }
        ]);
        toast.success('Currency added successfully');
      }
      
      setShowCurrencyForm(false);
      resetCurrency();
    } catch (error) {
      console.error('Error saving currency:', error);
      toast.error('Failed to save currency. Please try again.');
    }
  };

  const handleAddTax = () => {
    setEditingTax(null);
    resetTax();
    setShowTaxForm(true);
  };

  const handleEditTax = (tax: TaxRate) => {
    setEditingTax(tax);
    resetTax({
      country: tax.country,
      state: tax.state || '',
      rate: tax.rate,
      isActive: tax.isActive,
    });
    setShowTaxForm(true);
  };

  const handleDeleteTax = async (tax: TaxRate) => {
    // Check if tax rate is in use
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('taxRateId', '==', tax.id));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        toast.error('Cannot delete tax rate as it is being used in orders');
        return;
      }
    } catch (error) {
      console.error('Error checking tax rate usage:', error);
      toast.error('Failed to verify tax rate usage');
      return;
    }

    try {
      await deleteDoc(doc(db, 'taxRates', tax.id));
      setTaxRates(taxRates.filter(t => t.id !== tax.id));
      toast.success('Tax rate deleted successfully');
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      toast.error('Failed to delete tax rate');
    }
  };

  const onSubmitTax = async (data: TaxRateFormData) => {
    try {
      // Validate tax rate uniqueness for the same country/state combination
      const isRateUnique = taxRates.every(t => 
        (t.country.toLowerCase() !== data.country.toLowerCase() || 
         t.state?.toLowerCase() !== data.state?.toLowerCase()) ||
        (editingTax && t.id === editingTax.id)
      );
      if (!isRateUnique) {
        toast.error('A tax rate already exists for this country/state combination');
        return;
      }

      // Validate rate format
      const formattedRate = parseFloat(data.rate.toFixed(2));
      if (isNaN(formattedRate) || formattedRate < 0 || formattedRate > 100) {
        toast.error('Tax rate must be between 0 and 100');
        return;
      }

      if (editingTax) {
        // Update existing tax rate
        const taxRef = doc(db, 'taxRates', editingTax.id);
        await updateDoc(taxRef, { ...data, rate: formattedRate });
        setTaxRates(taxRates.map(t => 
          t.id === editingTax.id ? { ...t, ...data, rate: formattedRate } : t
        ));
        toast.success('Tax rate updated successfully');
      } else {
        // Add new tax rate
        const docRef = await addDoc(collection(db, 'taxRates'), { 
          ...data, 
          rate: formattedRate,
          createdAt: new Date().toISOString()
        });
        setTaxRates([...taxRates, { 
          id: docRef.id, 
          ...data, 
          rate: formattedRate,
          createdAt: new Date().toISOString()
        }]);
        toast.success('Tax rate added successfully');
      }
      
      setShowTaxForm(false);
      resetTax();
    } catch (error) {
      console.error('Error saving tax rate:', error);
      toast.error('Failed to save tax rate. Please try again.');
    }
  };

  const refreshExchangeRates = async () => {
    try {
      setUpdatingRates(true);
      const baseCurrency = await getBaseCurrencyCode();
      
      if (!baseCurrency) {
        toast.error('No default currency set. Please set a default currency first.');
        return;
      }

      toast.info(`Fetching exchange rates using ${baseCurrency} as base currency...`);

      const updatedCount = await updateAllExchangeRates(baseCurrency);
      
      // Refresh the currencies list
      const data = await getCurrencies();
      setCurrencies(data);
      
      if (updatedCount > 0) {
        toast.success(`Exchange rates updated for ${updatedCount} currencies`);
      } else {
        toast.info('No exchange rates were updated');
      }
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      toast.error('Failed to update exchange rates. Please try again.');
    } finally {
      setUpdatingRates(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading settings...</p>
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
          <h1 className="text-2xl font-bold text-foreground">Currency & Tax Settings</h1>
          <div className="flex items-center gap-4">
            <Button onClick={refreshExchangeRates} variant="outline" disabled={updatingRates}>
              <RiRefreshLine className="mr-2 h-4 w-4" />
              {updatingRates ? 'Updating...' : 'Refresh Exchange Rates'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Currencies Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Currencies</CardTitle>
              <Button onClick={handleAddCurrency}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Add Currency
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Code</th>
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Rate</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencies.map((currency) => (
                      <tr key={currency.id} className="border-b">
                        <td className="py-3 px-4">{currency.code}</td>
                        <td className="py-3 px-4">{currency.name}</td>
                        <td className="py-3 px-4">{currency.rate}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            currency.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {currency.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCurrency(currency)}
                            >
                              <RiEditLine className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCurrency(currency)}
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tax Rates Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tax Rates</CardTitle>
              <Button onClick={handleAddTax}>
                <RiAddLine className="mr-2 h-4 w-4" />
                Add Tax Rate
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Country</th>
                      <th className="text-left py-3 px-4">State</th>
                      <th className="text-left py-3 px-4">Rate</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRates.map((tax) => (
                      <tr key={tax.id} className="border-b">
                        <td className="py-3 px-4">{tax.country}</td>
                        <td className="py-3 px-4">{tax.state || '-'}</td>
                        <td className="py-3 px-4">{tax.rate}%</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tax.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tax.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTax(tax)}
                            >
                              <RiEditLine className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTax(tax)}
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Currency Form Modal */}
        {showCurrencyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{editingCurrency ? 'Edit Currency' : 'Add Currency'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCurrencySubmit(onSubmitCurrency)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency Code</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerCurrency('code')}
                      disabled={!!editingCurrency}
                    />
                    {currencyErrors.code && (
                      <p className="text-red-500 text-sm mt-1">{currencyErrors.code.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerCurrency('name')}
                    />
                    {currencyErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{currencyErrors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Symbol</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerCurrency('symbol')}
                    />
                    {currencyErrors.symbol && (
                      <p className="text-red-500 text-sm mt-1">{currencyErrors.symbol.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Exchange Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerCurrency('rate', { valueAsNumber: true })}
                    />
                    {currencyErrors.rate && (
                      <p className="text-red-500 text-sm mt-1">{currencyErrors.rate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Decimal Places</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerCurrency('decimals', { valueAsNumber: true })}
                    />
                    {currencyErrors.decimals && (
                      <p className="text-red-500 text-sm mt-1">{currencyErrors.decimals.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        {...registerCurrency('isDefault')}
                      />
                      Default Currency
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        {...registerCurrency('isActive')}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCurrencyForm(false);
                        setEditingCurrency(null);
                        resetCurrency();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCurrency ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tax Form Modal */}
        {showTaxForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTaxSubmit(onSubmitTax)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerTax('country')}
                    />
                    {taxErrors.country && (
                      <p className="text-red-500 text-sm mt-1">{taxErrors.country.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerTax('state')}
                    />
                    {taxErrors.state && (
                      <p className="text-red-500 text-sm mt-1">{taxErrors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-md"
                      {...registerTax('rate', { valueAsNumber: true })}
                    />
                    {taxErrors.rate && (
                      <p className="text-red-500 text-sm mt-1">{taxErrors.rate.message}</p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        {...registerTax('isActive')}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowTaxForm(false);
                        setEditingTax(null);
                        resetTax();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTax ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Confirm Delete</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Are you sure you want to delete {deletingCurrency?.name} ({deletingCurrency?.code})?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleConfirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 