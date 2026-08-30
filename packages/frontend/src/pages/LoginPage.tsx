import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, LayoutGrid } from 'lucide-react';
import client from '../lib/hc';
import { useToast } from '../contexts/ToastContext';
import { teacherAuth } from '../lib/storage';
import { extractErrorMessage, isTeacherLoginResponse, readResponseBody } from '../lib/apiResponse';

export const LoginPage: React.FC = () => {
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      addToast('warning', 'セッションの有効期限が切れました。安全のため再ログインしてください。');
      // Clean up the URL query parameter instantly
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password) {
      addToast('error', 'ユーザー名とパスワードを入力してください。');
      return;
    }

    setLoading(true);
    try {
      const res = await client.api.auth.teacher.login.$post({
        json: {
          username: username.trim(),
          password,
        },
      });

      const body = await readResponseBody(res);

      if (!res.ok) {
        throw new Error(extractErrorMessage(body, 'ユーザー名またはパスワードが正しくありません'));
      }

      if (!isTeacherLoginResponse(body)) {
        throw new Error('ログイン応答の形式が正しくありません。');
      }

      // Store authentication tokens & teacher profile details securely in browser storage
      teacherAuth.save(body);

      addToast('success', 'ログインしました。教員用管理画面へ移動します。');
      navigate('/room_layout');
    } catch (err: any) {
      addToast('error', err.message || 'サーバーとの通信に失敗しました。');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', background: 'linear-gradient(135deg, rgba(210, 95, 55, 0.08) 0%, rgba(248, 250, 252, 0) 50%)' }}>
      <header className="app-header">
        <div className="header-brand">
          <div className="logo-icon">
            <LayoutGrid size={24} style={{ color: 'var(--color-teacher)' }} />
          </div>
          <h1 className="header-title">Seats & Check</h1>
        </div>
      </header>
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(234, 88, 12, 0.1)', color: 'var(--color-teacher)', marginBottom: '1.5rem' }}>
            <Lock size={32} />
          </div>
          <h2 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>教員ログイン</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
            システム管理、および座席モニタリングを開始するためにアカウント情報を入力してください。
          </p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group" style={{ textAlign: 'left' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} /> ユーザー名
              </label>
              <input
                type="text"
                className="text-input"
                placeholder="ユーザー名を入力... (例: teacher_admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="input-group" style={{ textAlign: 'left' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={14} /> パスワード
              </label>
              <input
                type="password"
                className="text-input"
                placeholder="パスワードを入力..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '0.85rem', 
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  認証中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          {import.meta.env.DEV && <div style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: 'var(--border-radius)', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>💡 初期デモアカウント：</span><br />
            ユーザー名: <code style={{ color: 'var(--color-teacher)', fontFamily: 'monospace' }}>teacher_admin</code><br />
            パスワード: <code style={{ color: 'var(--color-teacher)', fontFamily: 'monospace' }}>admin123</code>
          </div>}
        </div>
      </main>
    </div>
  );
};
