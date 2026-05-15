import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/header';
import { api } from '../api/client';
import type { ProfileStats } from '../types';
import { useAuth } from '../context/AuthContext';

function StatCard({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-1">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white text-3xl font-bold">
        {value}
        {total !== undefined && (
          <span className="text-gray-500 text-lg font-normal"> / {total}</span>
        )}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ProfileStats>('/profile/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl font-bold">{user?.username}</h1>
            <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-colors"
          >
            Выйти
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {stats && (
          <div className="flex flex-col gap-4">
            <h2 className="text-gray-400 text-sm uppercase tracking-widest">Статистика</h2>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Коллекций собрано"
                value={stats.completedCollections}
                total={stats.totalCollections}
              />
              <StatCard
                label="Уникальных карточек"
                value={stats.uniqueCards}
                total={stats.totalCardsInGame}
              />
              <StatCard label="Карточек всего" value={stats.totalCards} />
              <StatCard
                label="Прогресс %"
                value={stats.totalCardsInGame > 0 ? Math.round((stats.uniqueCards / stats.totalCardsInGame) * 100) : 0}
              />
            </div>

            {stats.completedCollections === stats.totalCollections && (
              <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 text-center">
                <p className="text-orange-400 font-bold text-lg">🏆 Все коллекции собраны!</p>
                <p className="text-gray-400 text-sm mt-1">Вы настоящий коллекционер</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
