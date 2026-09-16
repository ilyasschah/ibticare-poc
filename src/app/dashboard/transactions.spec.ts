import { RECENT_TRANSACTIONS, Transaction, formatUsd, summarizeTransactions } from './transactions';

describe('summarizeTransactions', () => {
  it('computes totals, status counts, the highest transaction and the top customer', () => {
    const summary = summarizeTransactions(RECENT_TRANSACTIONS);

    expect(summary.totalTransactions).toBe(10);
    expect(summary.totalVolume).toBe(39340);
    expect(summary.paidRevenue).toBe(22040);
    expect(summary.pendingCount).toBe(3);
    expect(summary.pendingAmount).toBe(16000);
    expect(summary.statusCounts).toEqual({ Paid: 5, Pending: 3, Failed: 1, Refunded: 1 });
    expect(summary.highestTransaction?.id).toBe('TX-1004');
    expect(summary.topCustomer).toEqual({ customer: 'Umbrella Health', total: 15700 });
  });

  it('excludes failed and refunded transactions from customer spend', () => {
    const txs: Transaction[] = [
      { id: 'A', customer: 'Refunder', amount: 9000, status: 'Refunded', date: '2026-01-01' },
      { id: 'B', customer: 'Payer', amount: 100, status: 'Paid', date: '2026-01-02' },
    ];
    const summary = summarizeTransactions(txs);
    expect(summary.topCustomer).toEqual({ customer: 'Payer', total: 100 });
    expect(summary.highestTransaction?.id).toBe('A');
  });

  it('handles an empty list', () => {
    const summary = summarizeTransactions([]);
    expect(summary.totalTransactions).toBe(0);
    expect(summary.highestTransaction).toBeNull();
    expect(summary.topCustomer).toBeNull();
  });

  it('formats USD amounts', () => {
    expect(formatUsd(12400)).toBe('$12,400.00');
  });
});
