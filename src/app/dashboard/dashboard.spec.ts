import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Dashboard } from './dashboard';

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

  it('renders the summary KPIs', () => {
    const el = fixture.nativeElement as HTMLElement;
    const values = [...el.querySelectorAll('.kpi-value')].map((p) => p.textContent?.trim());
    expect(values).toEqual(['$22,040.00', '$39,340.00', '3', 'Umbrella Health']);
  });
});
