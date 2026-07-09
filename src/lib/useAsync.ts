import { useEffect, useState } from 'react';

/* Hook simples para dados assíncronos. Evita setState após desmontar e
   re-executa quando as deps mudam. Usado pela camada de dados (lib/api),
   que resolve na hora com mock ou faz a query no Supabase quando configurado. */

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive && setState({ data: undefined, loading: false, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
