import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ScreenContextService } from '../services/screen-context.service';
import {
  RECENT_TRANSACTIONS,
  TransactionStatus,
  formatUsd,
  summarizeTransactions,
} from './transactions';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly transactions = RECENT_TRANSACTIONS;
  protected readonly summary = summarizeTransactions(RECENT_TRANSACTIONS);
  protected readonly statusClass: Record<TransactionStatus, string> = {
    Paid: 'badge badge-paid',
    Pending: 'badge badge-pending',
    Failed: 'badge badge-failed',
    Refunded: 'badge badge-refunded',
  };

  constructor() {
    const screenContext = inject(ScreenContextService);
    const { highestTransaction, topCustomer } = this.summary;

    screenContext.setPageTitle('Dashboard');
    // Amounts are pre-formatted and aggregates pre-computed so small models don't have to do math.
    screenContext.setMetrics({
      totalTransactions: this.summary.totalTransactions,
      totalVolume: formatUsd(this.summary.totalVolume),
      paidRevenue: formatUsd(this.summary.paidRevenue),
      pendingTransactions: this.summary.pendingCount,
      pendingAmount: formatUsd(this.summary.pendingAmount),
      statusCounts: { ...this.summary.statusCounts },
      highestTransaction: highestTransaction
        ? {
            id: highestTransaction.id,
            customer: highestTransaction.customer,
            amount: formatUsd(highestTransaction.amount),
            status: highestTransaction.status,
            date: highestTransaction.date,
          }
        : 'none',
      highestSpendingCustomer: topCustomer
        ? { customer: topCustomer.customer, totalPaidAndPending: formatUsd(topCustomer.total) }
        : 'none',
      transactions: this.transactions.map((tx) => ({
        id: tx.id,
        customer: tx.customer,
        amount: formatUsd(tx.amount),
        status: tx.status,
        date: tx.date,
      })),
    });
  }
}
