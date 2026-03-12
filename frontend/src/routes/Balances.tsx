import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { fmt } from '../lib/formatters';
import { Spinner } from '../components/shared/Spinner';
import type { Account } from '../types';

const FIELDS: [string, keyof Account][] = [
  ['Portfolio Value', 'equity'], ['Cash', 'cash'], ['Buying Power', 'buying_power'],
  ['Regt Buying Power', 'regt_buying_power'], ['Daytrade Buying Power', 'daytrading_buying_power'],
  ['Options Buying Power', 'options_buying_power'], ['Long Market Value', 'long_market_value'],
  ['Short Market Value', 'short_market_value'], ['Initial Margin', 'initial_margin'],
  ['Maintenance Margin', 'maintenance_margin'], ['Last Equity', 'last_equity'], ['Accrued Fees', 'accrued_fees'],
];

export default function Balances() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    api.getAccount().then(setAccount).catch(() => {});
  }, []);

  if (!account) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Account Balances</div>
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map(([label, key]) => (
          <div key={key} className="border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-muted mb-1">{label}</div>
            <div className="text-[15px] font-bold">{fmt(account[key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
