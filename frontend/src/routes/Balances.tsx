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

  if (!account) return <div className="flex justify-center py-20"><Spinner className="w-5 h-5" /></div>;

  return (
    <div className="max-w-[960px]">
      <h1 className="text-lg font-bold mb-5">Balances</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map(([label, key]) => (
          <div key={key} className="terminal-card p-5">
            <div className="text-xs text-muted mb-1">{label}</div>
            <div className="text-base font-semibold font-mono">{fmt(account[key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
