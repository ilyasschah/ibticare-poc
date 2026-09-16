import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScreenContextService, ScreenMetrics } from '../services/screen-context.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  // Demo data until the dashboard is wired to a real API.
  protected readonly metrics: ScreenMetrics = { balance: '$54,200', activeUsers: 120 };

  constructor() {
    const screenContext = inject(ScreenContextService);
    screenContext.setPageTitle('Dashboard');
    screenContext.setMetrics(this.metrics);
  }
}
