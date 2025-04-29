import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { Currency } from '@/types';

// Collection references
const CURRENCIES_COLLECTION = 'currencies';
const SETTINGS_COLLECTION = 'settings';
const STORE_SETTINGS_DOC = 'store_settings';

/**
 * Fetch all currencies from Firestore
 */
export async function getCurrencies(): Promise<Currency[]> {
  try {
    const currenciesRef = collection(db, CURRENCIES_COLLECTION);
    const snapshot = await getDocs(currenciesRef);
    return snapshot.docs.map(doc => ({ 
      ...doc.data() as Currency, 
      id: doc.id 
    }));
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
}

/**
 * Get the default currency
 */
export async function getDefaultCurrency(): Promise<Currency | null> {
  try {
    const currenciesRef = collection(db, CURRENCIES_COLLECTION);
    const q = query(currenciesRef, where("isDefault", "==", true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { 
      ...doc.data() as Omit<Currency, 'id'>, 
      id: doc.id 
    };
  } catch (error) {
    console.error('Error fetching default currency:', error);
    throw error;
  }
}

/**
 * Add a new currency to Firestore
 */
export async function addCurrency(currencyData: Omit<Currency, 'id'>): Promise<string> {
  try {
    // If this is the default currency, make sure no other currency is default
    if (currencyData.isDefault) {
      await updateAllCurrenciesDefaultStatus(false);
    }
    
    const currenciesRef = collection(db, CURRENCIES_COLLECTION);
    const docRef = await addDoc(currenciesRef, {
      ...currencyData,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding currency:', error);
    throw error;
  }
}

/**
 * Update a currency in Firestore
 */
export async function updateCurrency(id: string, currencyData: Partial<Currency>): Promise<void> {
  try {
    // If this is being set as default, make sure no other currency is default
    if (currencyData.isDefault) {
      await updateAllCurrenciesDefaultStatus(false);
    }
    
    const currencyRef = doc(db, CURRENCIES_COLLECTION, id);
    await updateDoc(currencyRef, {
      ...currencyData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    throw error;
  }
}

/**
 * Delete a currency from Firestore
 */
export async function deleteCurrency(id: string): Promise<void> {
  try {
    const currencyRef = doc(db, CURRENCIES_COLLECTION, id);
    await deleteDoc(currencyRef);
  } catch (error) {
    console.error('Error deleting currency:', error);
    throw error;
  }
}

/**
 * Update all currencies to set isDefault to false
 */
async function updateAllCurrenciesDefaultStatus(isDefault: boolean): Promise<void> {
  try {
    const currenciesRef = collection(db, CURRENCIES_COLLECTION);
    const snapshot = await getDocs(currenciesRef);
    
    const updatePromises = snapshot.docs.map(doc => {
      return updateDoc(doc.ref, { isDefault });
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error updating currency default status:', error);
    throw error;
  }
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: Currency, 
  toCurrency: Currency
): number {
  // Convert from source currency to base currency (rate of 1.0)
  const amountInBaseCurrency = fromCurrency.isDefault 
    ? amount 
    : amount / fromCurrency.rate;
  
  // Convert from base currency to target currency
  const amountInTargetCurrency = toCurrency.isDefault
    ? amountInBaseCurrency
    : amountInBaseCurrency * toCurrency.rate;
    
  return amountInTargetCurrency;
}

/**
 * Format a currency amount according to the currency's rules
 */
export function formatCurrency(
  amount: number, 
  currency: Currency
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  }).format(amount);
}

/**
 * Get a list of common currencies with their details
 */
export function getCommonCurrencies(): Omit<Currency, 'id' | 'isDefault' | 'isActive' | 'rate' | 'createdAt' | 'updatedAt'>[] {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2 },
  ];
}

/**
 * Fetch exchange rates from ExchangeRate-API
 * Free plan limits apply - consider using paid API in production
 * 
 * @param baseCurrency - The base currency code (e.g., USD)
 * @returns Object with currency codes as keys and rates as values
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  try {
    // API URL - this is using the free ExchangeRate-API
    // In a real app, you'd use environment variables for the API key
    const url = `https://open.er-api.com/v6/latest/${baseCurrency}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid response format from exchange rate API');
    }
    
    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
}

/**
 * Update all currencies with the latest exchange rates
 * 
 * @param baseCurrencyCode - The code of the currency with rate 1.0
 * @returns Number of currencies updated
 */
export async function updateAllExchangeRates(baseCurrencyCode: string = 'USD'): Promise<number> {
  try {
    // 1. Get the latest rates from the API
    const rates = await fetchExchangeRates(baseCurrencyCode);
    
    // 2. Get all currencies from Firestore
    const currencies = await getCurrencies();
    
    // 3. Find the base currency
    const baseCurrency = currencies.find(c => c.code === baseCurrencyCode);
    
    if (!baseCurrency) {
      throw new Error(`Base currency ${baseCurrencyCode} not found in database`);
    }
    
    // 4. Update each currency with the new rate
    const updatePromises = currencies
      .filter(currency => currency.code !== baseCurrencyCode) // Skip the base currency
      .map(currency => {
        if (rates[currency.code]) {
          return updateCurrency(currency.id, { 
            rate: rates[currency.code],
            updatedAt: serverTimestamp()
          });
        }
        return null;
      })
      .filter(Boolean); // Remove null values (currencies not found in API)
    
    // 5. Execute all updates
    await Promise.all(updatePromises);
    
    return updatePromises.length;
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    throw error;
  }
}

/**
 * Get the base currency code (the default currency)
 * 
 * @returns The code of the base currency, or 'USD' if not found
 */
export async function getBaseCurrencyCode(): Promise<string> {
  try {
    const defaultCurrency = await getDefaultCurrency();
    return defaultCurrency?.code || 'USD';
  } catch (error) {
    console.error('Error getting base currency code:', error);
    return 'USD'; // Fallback to USD
  }
} 