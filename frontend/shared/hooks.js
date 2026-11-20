import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

export function useApi(url, params = {}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const signature = JSON.stringify(params);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api
      .get(url, { params: JSON.parse(signature), signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e.code !== 'ERR_CANCELED') setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, signature, version]);
  return { data, error, loading, reload, setData };
}
export function useDebounce(value, delay = 300) {
  const [v, set] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => set(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
