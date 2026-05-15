import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Card<span className="text-orange-400">Collect</span>
          </h1>
          <p className="text-gray-400 mt-2">Начните свою коллекцию</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-2xl p-8 border border-gray-700 flex flex-col gap-4"
        >
          <h2 className="text-white text-xl font-semibold">Регистрация</h2>

          {error && (
            <div className="bg-red-900/40 border border-red-500/50 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-sm">Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="collector"
              className="bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:border-orange-500 transition-colors placeholder-gray-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:border-orange-500 transition-colors placeholder-gray-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-sm">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Минимум 6 символов"
              className="bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:border-orange-500 transition-colors placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed
              text-white font-semibold rounded-xl py-2.5 transition-colors"
          >
            {loading ? 'Регистрируем...' : 'Создать аккаунт'}
          </button>

          <p className="text-center text-gray-400 text-sm">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
