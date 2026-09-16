export type TransactionStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';

export interface Transaction {
  id: string;
  customer: string;
  amount: number;
  status: TransactionStatus;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  /** Sum of every transaction regardless of status. */
  totalVolume: number;
  /** Sum of Paid transactions only. */
  paidRevenue: number;
  pendingCount: number;
  pendingAmount: number;
  statusCounts: Record<TransactionStatus, number>;
  highestTransaction: Transaction | null;
  /** Customer with the largest Paid + Pending total. */
  topCustomer: { customer: string; total: number } | null;
}

// Demo data until the dashboard is wired to a real API.
export const RECENT_TRANSACTIONS: readonly Transaction[] = [
  { id: 'TX-1010', customer: 'Initech', amount: 640, status: 'Paid', date: '2026-09-14' },
  { id: 'TX-1009', customer: 'Umbrella Health', amount: 3300, status: 'Pending', date: '2026-09-13' },
  { id: 'TX-1008', customer: 'Globex', amount: 980, status: 'Refunded', date: '2026-09-11' },
  { id: 'TX-1007', customer: 'Wayne Medical', amount: 5600, status: 'Paid', date: '2026-09-10' },
  { id: 'TX-1006', customer: 'Stark Clinics', amount: 7900, status: 'Pending', date: '2026-09-08' },
  { id: 'TX-1005', customer: 'Acme Corp', amount: 2150, status: 'Paid', date: '2026-09-07' },
  { id: 'TX-1004', customer: 'Umbrella Health', amount: 12400, status: 'Paid', date: '2026-09-05' },
  { id: 'TX-1003', customer: 'Initech', amount: 320, status: 'Failed', date: '2026-09-03' },
  { id: 'TX-1002', customer: 'Globex', amount: 4800, status: 'Pending', date: '2026-09-02' },
  { id: 'TX-1001', customer: 'Acme Corp', amount: 1250, status: 'Paid', date: '2026-09-01' },
];

export function summarizeTransactions(transactions: readonly Transaction[]): TransactionSummary {
  const statusCounts: Record<TransactionStatus, number> = { Paid: 0, Pending: 0, Failed: 0, Refunded: 0 };
  const customerTotals = new Map<string, number>();
  let totalVolume = 0;
  let paidRevenue = 0;
  let pendingAmount = 0;
  let highestTransaction: Transaction | null = null;

  for (const tx of transactions) {
    statusCounts[tx.status]++;
    totalVolume += tx.amount;
    if (tx.status === 'Paid') paidRevenue += tx.amount;
    if (tx.status === 'Pending') pendingAmount += tx.amount;
    if (tx.status === 'Paid' || tx.status === 'Pending') {
      customerTotals.set(tx.customer, (customerTotals.get(tx.customer) ?? 0) + tx.amount);
    }
    if (!highestTransaction || tx.amount > highestTransaction.amount) {
      highestTransaction = tx;
    }
  }

  let topCustomer: TransactionSummary['topCustomer'] = null;
  for (const [customer, total] of customerTotals) {
    if (!topCustomer || total > topCustomer.total) topCustomer = { customer, total };
  }

  return {
    totalTransactions: transactions.length,
    totalVolume,
    paidRevenue,
    pendingCount: statusCounts.Pending,
    pendingAmount,
    statusCounts,
    highestTransaction,
    topCustomer,
  };
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUsd(amount: number): string {
  return usd.format(amount);
}
