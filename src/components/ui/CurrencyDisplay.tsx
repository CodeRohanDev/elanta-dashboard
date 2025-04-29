'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, getDefaultCurrency } from '@/lib/currencyUtils';
import { Currency } from '@/types';

interface CurrencyDisplayProps {
  amount: number;
  sourceCurrency?: Currency;
  showCurrencyCode?: boolean;
  className?: string;
}

export default function CurrencyDisplay({ 
  amount, 
  sourceCurrency, 
  showCurrencyCode = false,
  className = ''
}: CurrencyDisplayProps) {
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDefaultCurrency() {
      try {
        const currency = await getDefaultCurrency();
        setDefaultCurrency(currency);
      } catch (error) {
        console.error('Error loading default currency:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!sourceCurrency) {
      loadDefaultCurrency();
    } else {
      setLoading(false);
    }
  }, [sourceCurrency]);

  if (loading) {
    return <span className={className}>—</span>;
  }

  // Use provided currency or fall back to default
  const currency = sourceCurrency || defaultCurrency;

  if (!currency) {
    // No currency available, just show the amount
    return <span className={className}>{amount.toFixed(2)}</span>;
  }

  // Format according to currency rules
  const formattedValue = formatCurrency(amount, currency);

  return (
    <span className={className}>
      {formattedValue} 
      {showCurrencyCode && ` ${currency.code}`}
    </span>
  );
} 