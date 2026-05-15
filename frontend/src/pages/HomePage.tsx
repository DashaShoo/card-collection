import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/header';
import CollectionSection from '../components/CollectionSection';
import { api } from '../api/client';
import type { Collections } from '../types';

export default function HomePage() {
  const [collections, setCollections] = useState<Collections>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCollections = useCallback(async () => {
    try {
      const data = await api.get<{ collections: Collections }>('/collections');
      setCollections(data.collections);
    } catch {
      setError('Не удалось загрузить коллекции');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    const handler = () => loadCollections();
    window.addEventListener('cardclaimed', handler);
    return () => window.removeEventListener('cardclaimed', handler);
  }, [loadCollections]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <h1 className="text-white text-3xl font-bold mb-8">Коллекции</h1>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-400 rounded-xl px-6 py-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-10">
            {Object.entries(collections).map(([name, cards]) => (
              <CollectionSection key={name} name={name} cards={cards} />
            ))}
            {Object.keys(collections).length === 0 && (
              <p className="text-gray-500 text-center py-20">Коллекции не найдены</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
