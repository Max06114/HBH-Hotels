import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2, Euro, TrendingUp } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  if (price === null || price === undefined) return '0,00';
  return price.toFixed(2).replace('.', ',');
};

const PaymentsManagement = () => {
  const { t, language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/payments`, { headers: getAuthHeaders() });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Calculate sum of all paid deposits
  const totalPaidDeposits = payments
    .filter(p => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidCount = payments.filter(p => p.status === 'paid' || p.status === 'completed').length;

  const getStatusBadge = (status) => {
    const config = {
      initiated: { label: 'Initiiert', className: 'bg-gray-100 text-gray-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      completed: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
      failed: { label: 'Fehlgeschlagen', className: 'bg-red-100 text-red-800' },
    };
    const c = config[status] || config.initiated;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-payments">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-8">{t('adminPayments')}</h1>
      
      {/* Sum of Paid Deposits */}
      <Card className="border-[#E5E0D5] bg-gradient-to-r from-green-50 to-emerald-50 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Euro className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">
                  {language === 'de' ? 'Summe bezahlter Anzahlungen' : 'Total Paid Deposits'}
                </p>
                <p className="text-3xl font-bold text-green-800">
                  {formatPrice(totalPaidDeposits)} €
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">{paidCount}</span>
              </div>
              <p className="text-sm text-green-600">
                {language === 'de' ? 'Zahlungen' : 'Payments'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-[#E5E0D5]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>{language === 'de' ? 'Methode' : 'Method'}</TableHead>
                  <TableHead>{language === 'de' ? 'Betrag' : 'Amount'}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{language === 'de' ? 'Datum' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-[#F5F2EA]">
                    <TableCell className="font-mono text-xs">{payment.session_id?.slice(0, 20)}...</TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell className="font-semibold">{formatPrice(payment.amount)} {payment.currency}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleDateString('de-DE')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {payments.length === 0 && (
            <div className="text-center py-12 text-[#4A4A4A]">
              {language === 'de' ? 'Keine Zahlungen vorhanden.' : 'No payments found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsManagement;
