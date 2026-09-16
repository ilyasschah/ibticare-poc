import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';
import { ScreenContextService } from '../services/screen-context.service';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
  });

  it('renders the transactions table with a header and one row per transaction', () => {
    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Transaction ID', 'Customer', 'Amount', 'Status', 'Date']);
    expect(el.querySelectorAll('tbody tr').length).toBe(10);
    expect(el.querySelector('tbody tr .badge')?.textContent?.trim()).toBe('Paid');
  });

  it('publishes the summary to the screen context', () => {
    const { pageTitle, metrics } = TestBed.inject(ScreenContextService).context();
    expect(pageTitle).toBe('Dashboard');
    expect(metrics['pendingTransactions']).toBe(3);
    expect(metrics['paidRevenue']).toBe('$22,040.00');
    expect(metrics['highestTransaction']).toEqual({
      id: 'TX-1004',
      customer: 'Umbrella Health',
      amount: '$12,400.00',
      status: 'Paid',
      date: '2026-09-05',
    });
    expect(metrics['highestSpendingCustomer']).toEqual({
      customer: 'Umbrella Health',
      totalPaidAndPending: '$15,700.00',
    });
    expect((metrics['transactions'] as unknown[]).length).toBe(10);
  });
});
