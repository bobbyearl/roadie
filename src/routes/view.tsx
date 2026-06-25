import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/view')({
  beforeLoad: () => {
    throw redirect({ to: '/view/$stateId', params: { stateId: 'sc' } } as never);
  },
});
