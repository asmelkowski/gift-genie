import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DrawsParams {
  status?: 'pending' | 'finalized';
  page: number;
  page_size: number;
  sort: string;
}

export const useDrawsParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(
    () => ({
      status: (searchParams.get('status') as 'pending' | 'finalized' | null) || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      page_size: parseInt(searchParams.get('page_size') || '10', 10),
      sort: searchParams.get('sort') || '-created_at',
    }),
    [searchParams]
  );

  const updateParams = useCallback(
    (updates: Partial<DrawsParams>) => {
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return { params, updateParams };
};
