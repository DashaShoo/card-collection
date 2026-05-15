import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { DailyStatus, Card } from '../types';
import NewCardModal from './NewCardModal';

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function Header() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [countdown, setCountdown] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [newCard, setNewCard] = useState<Card | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get<DailyStatus>('/daily/status');
      setStatus(data);
    } catch {
      // not authenticated yet
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.nextClaimAt) {
      setCountdown('');
      return;
    }
    const tick = () => {
      const t = formatCountdown(status.nextClaimAt!);
      setCountdown(t);
      if (t === '00:00:00') loadStatus();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.nextClaimAt, loadStatus]);

  const handleClaim = async () => {
    if (!status?.canClaim || claiming) return;
    setClaiming(true);
    try {
      const data = await api.post<{ success: boolean; card: Card }>('/daily/claim');
      if (data.success) {
        setNewCard(data.card);
        loadStatus();
        window.dispatchEvent(new CustomEvent('cardclaimed'));
      }
    } catch {
      // already claimed or error
      loadStatus();
    } finally {
      setClaiming(false);
    }
  };

  const canClaim = status?.canClaim ?? false;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-white font-bold text-xl tracking-tight hover:text-orange-400 transition-colors"
        >
          Card<span className="text-orange-400">Collect</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200
                ${canClaim
                  ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer hover:scale-105'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
            >
              {claiming ? 'Получаем...' : '🎴 Получить карточку'}
            </button>
            {!canClaim && countdown && (
              <span className="text-gray-500 text-xs mt-1 tabular-nums">
                {countdown}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            title="Профиль"
          >
            <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </button>
        </div>
      </header>

      {newCard && (
        <NewCardModal card={newCard} onClose={() => setNewCard(null)} />
      )}
    </>
  );
}
