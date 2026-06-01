import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2 } from 'lucide-react';

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

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/admin/payments`, { headers: getAuthHeaders() });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      initiated: { label: 'Initiiert', className: 'bg-gray-100 text-gray-800' },
      paid: { label: 'Bezahlt', className: 'bg-green-100 text-green-800' },
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
