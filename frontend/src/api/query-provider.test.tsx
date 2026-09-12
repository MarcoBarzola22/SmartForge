import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { QueryProvider } from './QueryProvider';

const TestComponent = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['testKey'],
    queryFn: async () => 'Datos cargados desde React Query'
  });

  if (isLoading) return <div>Cargando...</div>;
  return <div>{data}</div>;
};

describe('TASK-61: QueryProvider & TanStack Query Configuration (DT-05)', () => {
  it('should provide QueryClient context to child components', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(
      await screen.findByText('Datos cargados desde React Query')
    ).toBeInTheDocument();
  });
});
