import { Injectable, computed, signal } from '@angular/core';
import { RECENT_TRANSACTIONS, Transaction, summarizeTransactions } from '../dashboard/transactions';

/**
 * The transaction book.
 *
 * Root-level rather than owned by the Dashboard component, because the assistant must be able to
 * answer "who is my best customer?" while the user is on another page entirely.
 */
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly state = signal<readonly Transaction[]>(RECENT_TRANSACTIONS);

  readonly transactions = this.state.asReadonly();
  readonly summary = computed(() => summarizeTransactions(this.state()));
}
