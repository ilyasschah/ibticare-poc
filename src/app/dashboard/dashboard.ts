import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { TransactionsService } from '../services/transactions.service';
import { TransactionStatus } from './transactions';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly data = inject(TransactionsService);

  protected readonly transactions = this.data.transactions;
  protected readonly summary = this.data.summary;
  protected readonly statusClass: Record<TransactionStatus, string> = {
    Paid: 'badge badge-paid',
    Pending: 'badge badge-pending',
    Failed: 'badge badge-failed',
    Refunded: 'badge badge-refunded',
  };
}
