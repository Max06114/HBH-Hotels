import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Percent, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API } from './utils';

const eur = (v) => `${(v || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const COLS = [['bookings', 'Buchungen'], ['nights', 'Nächte'], ['revenue', 'Umsatz'], ['purchase', 'Einkauf'], ['margin', 'Marge'], ['margin_tax', 'Margensteuer'], ['net_margin', 'Netto-Marge']];
const cell = (k, r) => (['bookings', 'nights'].includes(k) ? r[k] : eur(r[k]));

const Row = ({ r, total }) => (
  <tr className={total ? 'font-semibold border-t-2 border-[#6B1D2A] bg-[#F5F2EA]' : 'border-t border-[#E5E0D5]'} data-testid={total ? 'margin-total-row' : `margin-row-${r.hotel_id}`}>
    <td className="py-2 pr-4">{total ? 'Gesamt' : r.hotel_name}</td>
    {COLS.map(([k]) => (
      <td key={k} className={`py-2 px-2 text-right whitespace-nowrap ${k === 'margin_tax' ? 'text-[#B45309]' : ''} ${k === 'net_margin' ? 'text-[#6B1D2A]' : ''}`}>
        {cell(k, r)}{k === 'margin' && <span className="text-xs text-[#4A4A4A] ml-1">({String(r.margin_pct).replace('.', ',')} %)</span>}
      </td>
    ))}
  </tr>
);

const MarginAnalytics = () => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API}/admin/analytics/margins`, { headers: getAuthHeaders() }).then((r) => setData(r.data)).catch(() => setData({ hotels: [], total: null }));
  }, [getAuthHeaders]);

  return (
    <Card className="border-[#E5E0D5]" data-testid="margin-analytics">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Percent className="w-5 h-5 text-[#6B1D2A]" />Margen & Margensteuer nach Hotel</CardTitle>
        <p className="text-xs text-[#4A4A4A]">Bezahlte Buchungen (Anzahlung oder voll). Marge = Verkaufspreis − Einkaufspreis × Nächte; Margensteuer = 19/119 der Marge (§ 25 UStG).</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!data ? <Loader2 className="w-6 h-6 animate-spin text-[#6B1D2A] mx-auto" /> : data.hotels.length === 0 ? (
          <p className="text-center text-[#4A4A4A] py-4">Noch keine bezahlten Buchungen</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[['Marge gesamt', data.total.margin, 'margin-sum'], ['Margensteuer gesamt', data.total.margin_tax, 'margin-tax-sum'], ['Netto-Marge gesamt', data.total.net_margin, 'net-margin-sum']].map(([l, v, id]) => (
                <div key={id} className="p-4 bg-[#F5F2EA] rounded-lg"><p className="text-sm text-[#4A4A4A]">{l}</p><p className="text-2xl font-bold text-[#1A1A1A]" data-testid={id}>{eur(v)}</p></div>
              ))}
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[#4A4A4A]"><th className="py-2 pr-4">Hotel</th>{COLS.map(([k, l]) => <th key={k} className="py-2 px-2 text-right">{l}</th>)}</tr></thead>
              <tbody>{data.hotels.map((r) => <Row key={r.hotel_id} r={r} />)}<Row r={data.total} total /></tbody>
            </table>
            {data.missing_purchase_price?.length > 0 && <p className="text-xs text-red-700 mt-3">Ohne Einkaufspreis (nicht berechnet): {data.missing_purchase_price.join(', ')}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MarginAnalytics;
