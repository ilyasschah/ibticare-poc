import { inject } from '@angular/core';
import { AgentContextService } from '../agent-context.service';
import { TransactionsService } from '../../services/transactions.service';
import { formatUsd } from '../../dashboard/transactions';

/**
 * Exposes the transaction book to the assistant.
 *
 * Every amount is pre-formatted and every aggregate pre-computed: a 1.5B model reliably quotes
 * "$12,400.00" from the snapshot, and just as reliably gets it wrong if asked to add the column up.
 */
export function registerDashboardDomain(): void {
  const context = inject(AgentContextService);
  const transactions = inject(TransactionsService);

  context.register({
    id: 'dashboard',
    description:
      'Recent customer transactions, with totals and the top customer already worked out.',
    snapshot: () => {
      const summary = transactions.summary();
      const { highestTransaction, topCustomer } = summary;

      return {
        totalTransactions: summary.totalTransactions,
        totalVolume: formatUsd(summary.totalVolume),
        paidRevenue: formatUsd(summary.paidRevenue),
        pendingTransactions: summary.pendingCount,
        pendingAmount: formatUsd(summary.pendingAmount),
        statusCounts: { ...summary.statusCounts },
        highestTransaction: highestTransaction
          ? {
              id: highestTransaction.id,
              customer: highestTransaction.customer,
              amount: formatUsd(highestTransaction.amount),
              status: highestTransaction.status,
              date: highestTransaction.date,
            }
          : null,
        bestCustomer: topCustomer
          ? { customer: topCustomer.customer, totalPaidAndPending: formatUsd(topCustomer.total) }
          : null,
        transactions: transactions.transactions().map((tx) => ({
          id: tx.id,
          customer: tx.customer,
          amount: formatUsd(tx.amount),
          status: tx.status,
          date: tx.date,
        })),
      };
    },
    examples: () => {
      const { topCustomer, pendingCount } = transactions.summary();
      const best = topCustomer
        ? `${topCustomer.customer}, with ${formatUsd(topCustomer.total)} paid and pending.`
        : 'There are no customers yet.';
      return [
        { question: 'who is my best customer?', answer: best },
        {
          question: 'how many pending transactions are there?',
          answer: `There are ${pendingCount} pending transactions.`,
        },
      ];
    },
  });
}
