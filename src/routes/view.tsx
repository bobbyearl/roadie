import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { TrafficProvider } from '../lib/TrafficContext';
import { Home } from './view.$stateId';

export const Route = createFileRoute('/view')({
  component: () => (
    <ErrorBoundary>
      <TrafficProvider>
        <Home />
        <Outlet />
      </TrafficProvider>
    </ErrorBoundary>
  ),
});
