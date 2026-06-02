// ─── FIXES IN THIS FILE ───────────────────────────────────────────────────
// 1. Removed `import axios` — not installed, crashes Vite build
// 2. Removed `import BudgetForm` — imported but never used, ESLint error
// 3. useEffect & loading useState were OUTSIDE the App function body — moved inside
// 4. Session restore on page reload (GET /api/auth/me on mount)
// 5. Loading state blocks render until data is ready — fixes blank screen
// 6. LoginScreen submit was still showing demo credentials box — removed
// 7. AddTransactionModal was never POSTing to backend — wired to apiFetch
// 8. Notification click only updated local state — now calls PUT API too
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

// ─── API layer ────────────────────────────────────────────────────────────
const API_BASE  = 'http://localhost:5000/api';
const getToken  = ()    => localStorage.getItem('fintrack_token');
const setToken  = (t)   => localStorage.setItem('fintrack_token', t);
const clearToken = ()   => localStorage.removeItem('fintrack_token');

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res   = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
};

// ─── Category config ──────────────────────────────────────────────────────
const CAT = {
  food:            { label: 'Food & Dining',   emoji: '🍽️', color: '#f59e0b' },
  transport:       { label: 'Transport',        emoji: '🚗', color: '#3b82f6' },
  housing:         { label: 'Housing',          emoji: '🏠', color: '#6366f1' },
  utilities:       { label: 'Utilities',        emoji: '💡', color: '#14b8a6' },
  healthcare:      { label: 'Healthcare',       emoji: '🏥', color: '#ef4444' },
  entertainment:   { label: 'Entertainment',    emoji: '🎬', color: '#8b5cf6' },
  shopping:        { label: 'Shopping',         emoji: '🛍️', color: '#ec4899' },
  education:       { label: 'Education',        emoji: '📚', color: '#0ea5e9' },
  travel:          { label: 'Travel',           emoji: '✈️', color: '#10b981' },
  personal:        { label: 'Personal',         emoji: '👤', color: '#94a3b8' },
  insurance:       { label: 'Insurance',        emoji: '🛡️', color: '#64748b' },
  debt:            { label: 'Debt',             emoji: '💳', color: '#dc2626' },
  subscriptions:   { label: 'Subscriptions',    emoji: '📱', color: '#7c3aed' },
  gifts:           { label: 'Gifts',            emoji: '🎁', color: '#fb923c' },
  other_expense:   { label: 'Other',            emoji: '📦', color: '#78716c' },
  salary:          { label: 'Salary',           emoji: '💼', color: '#10b981' },
  freelance:       { label: 'Freelance',        emoji: '🧑‍💻', color: '#a78bfa' },
  investment:      { label: 'Investment',       emoji: '📈', color: '#f59e0b' },
  bonus:           { label: 'Bonus',            emoji: '🎁', color: '#fb923c' },
  rental:          { label: 'Rental',           emoji: '🏘️', color: '#34d399' },
  other_income:    { label: 'Other Income',     emoji: '💵', color: '#34d399' },
  savings_deposit: { label: 'Savings',          emoji: '💰', color: '#6366f1' },
  savings_withdrawal: { label: 'Withdrawal',    emoji: '💸', color: '#f87171' },
  transfer:        { label: 'Transfer',         emoji: '↔️', color: '#94a3b8' },
};
const getCat = (id) => CAT[id] || { label: id, emoji: '📊', color: '#6366f1' };

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt = (n = 0, cur = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ─── Radial progress ring ─────────────────────────────────────────────────
function Ring({ pct = 0, color = '#6366f1', size = 72, stroke = 6, children }) {
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      {children && (
        <foreignObject x={stroke} y={stroke} width={size - stroke*2} height={size - stroke*2}>
          <div style={{ transform: 'rotate(90deg)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────
function Bar({ pct = 0, color = '#6366f1', height = 8 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 10, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ─── Shared CSS classes (injected once) ───────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes orb      { from { transform:translate(-50%,-50%) scale(1); } to { transform:translate(-50%,-50%) scale(1.2); } }
  body { background:#080c14; color:#fff; font-family:'DM Sans',sans-serif; }
  .card  { background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:22px; }
  .input { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:11px; padding:12px 14px; color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; width:100%; outline:none; transition:border-color .2s; }
  .input:focus { border-color:#6366f1; }
  select.input option { background:#1a2035; }
  .btn  { border:none; border-radius:10px; padding:10px 18px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; cursor:pointer; transition:all .18s; }
  .btn:hover { transform:translateY(-1px); opacity:.92; }
  .btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; }
  .pill-income  { background:rgba(16,185,129,.15); color:#34d399; }
  .pill-expense { background:rgba(239,68,68,.15);  color:#f87171; }
  .pill-savings { background:rgba(99,102,241,.15); color:#818cf8; }
  .nav-btn { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:none; background:none; color:rgba(255,255,255,.4); font-size:13.5px; font-weight:500; font-family:'DM Sans',sans-serif; cursor:pointer; width:100%; text-align:left; transition:all .2s; }
  .nav-btn:hover  { background:rgba(255,255,255,.06); color:rgba(255,255,255,.8); }
  .nav-btn.active { background:rgba(99,102,241,.18); color:#818cf8; }
  .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(8px); z-index:200; display:flex; align-items:center; justify-content:center; }
  .modal    { background:#111827; border:1px solid rgba(255,255,255,.1); border-radius:22px; padding:30px; width:460px; max-width:94vw; animation:fadeUp .25s ease; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [tab,     setTab]     = useState('login'); // 'login' | 'register'
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const endpoint = tab === 'register' ? '/auth/register' : '/auth/login';
      const body     = tab === 'register'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const data = await apiFetch(endpoint, { method: 'POST', body });
      setToken(data.accessToken);
      onLogin(data.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080c14', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <style>{STYLES}</style>

      {/* Background orbs */}
      {['#6366f1','#10b981','#f59e0b'].map((c,i) => (
        <div key={i} style={{ position:'absolute', borderRadius:'50%',
          width:360+i*80, height:360+i*80,
          background:`radial-gradient(circle,${c}28 0%,transparent 70%)`,
          left:`${[12,55,75][i]}%`, top:`${[15,65,8][i]}%`,
          transform:'translate(-50%,-50%)',
          animation:`orb ${4+i*1.2}s ease-in-out infinite alternate` }} />
      ))}

      <div style={{ background:'rgba(255,255,255,0.04)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:24, padding:'40px 44px', width:400, position:'relative', zIndex:10, animation:'fadeUp .4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:38, marginBottom:8 }}>💎</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:'#fff', margin:0 }}>FinTrack</h1>
          <p style={{ color:'rgba(255,255,255,.4)', fontSize:13, marginTop:5 }}>Smart personal finance</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,.05)', borderRadius:12, padding:4, marginBottom:24 }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setErr(''); }} style={{
              flex:1, padding:'9px', border:'none', borderRadius:9, cursor:'pointer',
              background: tab===t ? 'rgba(99,102,241,.35)' : 'transparent',
              color: tab===t ? '#a5b4fc' : 'rgba(255,255,255,.4)',
              fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
              transition:'all .2s', textTransform:'capitalize',
            }}>{t === 'login' ? 'Sign In' : 'Register'}</button>
          ))}
        </div>

        {err && (
          <div style={{ background:'rgba(239,68,68,.14)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'11px 14px', color:'#fca5a5', fontSize:13, marginBottom:18 }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {tab === 'register' && (
            <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} required />
          )}
          <input className="input" type="email" placeholder="Email address" value={form.email} onChange={set('email')} required />
          <input className="input" type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={set('password')} required minLength={8} />
          <button type="submit" disabled={busy} className="btn" style={{ marginTop:6, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', padding:'13px', fontSize:15 }}>
            {busy ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,       setUser]       = useState(null);
  const [view,       setView]       = useState('dashboard');
  const [animKey,    setAnimKey]    = useState(0);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [addTxOpen,  setAddTxOpen]  = useState(false);
  const [appLoading, setAppLoading] = useState(true); // ← starts true; prevents blank flash

  const [data, setData] = useState({
    overview:      null,
    transactions:  [],
    budgets:       [],
    savings:       [],
    notifications: [],
  });

  // ── Restore session on page reload ───────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setAppLoading(false); return; }
    apiFetch('/auth/me')
      .then(res => setUser(res.user))
      .catch(() => { clearToken(); })
      .finally(() => setAppLoading(false));
  }, []);

  // ── Load all data once user is known ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setAppLoading(true);
    Promise.all([
      apiFetch('/analytics/overview?period=month'),
      apiFetch('/transactions?limit=30&sort=-date'),
      apiFetch('/budgets?isActive=true'),
      apiFetch('/savings'),
      apiFetch('/notifications?limit=30'),
    ])
      .then(([ov, txR, bR, sR, nR]) => {
        setData({
          overview:      ov.overview      ?? null,
          transactions:  txR.transactions  ?? [],
          budgets:       bR.budgets        ?? [],
          savings:       sR.goals          ?? [],
          notifications: nR.notifications  ?? [],
        });
      })
      .catch(err => console.error('Load error:', err.message))
      .finally(() => setAppLoading(false));
  }, [user]);

  const navigate = (v) => {
    setView(v);
    setAnimKey(k => k + 1);
  };

  const unread = data.notifications.filter(n => !n.isRead).length;

  const markOneRead = async (id) => {
    try { await apiFetch(`/notifications/${id}/read`, { method: 'PUT' }); } catch (_) {}
    setData(p => ({ ...p, notifications: p.notifications.map(n => n._id === id ? { ...n, isRead: true } : n) }));
  };

  const markAllRead = async () => {
    try { await apiFetch('/notifications/read-all', { method: 'PUT' }); } catch (_) {}
    setData(p => ({ ...p, notifications: p.notifications.map(n => ({ ...n, isRead: true })) }));
    setNotifOpen(false);
  };

  const signOut = () => { clearToken(); setUser(null); setData({ overview: null, transactions: [], budgets: [], savings: [], notifications: [] }); };

  // ── Splash / loading ──────────────────────────────────────────────────────
  if (appLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{STYLES}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>💎</div>
          <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Loading FinTrack…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={setUser} />;

  const NAVS = [
    { id: 'dashboard',    label: 'Dashboard',    icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'budgets',      label: 'Budgets',      icon: '📁' },
    { id: 'savings',      label: 'Savings',      icon: '🏦' },
    { id: 'analytics',    label: 'Analytics',    icon: '📈' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#fff', display: 'flex', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{STYLES}</style>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={{ width: 220, minHeight: '100vh', padding: '26px 14px', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 8, marginBottom: 32 }}>
          <span style={{ fontSize: 22 }}>💎</span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 19, fontWeight: 800 }}>FinTrack</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAVS.map(n => (
            <button key={n.id} className={`nav-btn ${view === n.id ? 'active' : ''}`} onClick={() => navigate(n.id)}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.35)', fontFamily: "'DM Mono',monospace" }}>{user.role}</p>
            </div>
          </div>
          <button onClick={signOut} className="btn" style={{ width: '100%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'sticky', top: 0, background: '#080c14', zIndex: 50 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 21, fontWeight: 700, margin: 0 }}>
              {NAVS.find(n => n.id === view)?.icon} {NAVS.find(n => n.id === view)?.label}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.35)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setAddTxOpen(true)} className="btn" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
              + Add Transaction
            </button>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(p => !p)} className="btn" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '8px 10px', fontSize: 16, position: 'relative' }}>
                🔔
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, width: 17, height: 17, background: '#ef4444', borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setNotifOpen(false)} />
                  <div style={{ position: 'absolute', right: 0, top: 48, width: 340, background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, zIndex: 100, boxShadow: '0 20px 60px rgba(0,0,0,.5)', overflow: 'hidden', animation: 'fadeUp .2s ease' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications {unread > 0 && <span style={{ color: '#818cf8' }}>({unread})</span>}</span>
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Mark all read</button>
                    </div>
                    <div style={{ maxHeight: 340, overflow: 'auto' }}>
                      {data.notifications.length === 0
                        ? <p style={{ padding: '22px', textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No notifications</p>
                        : data.notifications.map(n => (
                          <div key={n._id} onClick={() => markOneRead(n._id)}
                            style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', background: n.isRead ? 'transparent' : 'rgba(99,102,241,.07)', cursor: 'pointer', transition: 'background .15s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: n.isRead ? 'rgba(255,255,255,.55)' : '#fff' }}>{n.title}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,.38)', lineHeight: 1.4 }}>{n.message}</p>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', fontFamily: "'DM Mono',monospace", display: 'block', marginTop: 5 }}>{ago(n.createdAt)}</span>
                              </div>
                              {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 5 }} />}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div key={animKey} style={{ padding: 28, animation: 'fadeUp .25s ease' }}>
          {view === 'dashboard'    && <Dashboard    data={data} />}
          {view === 'transactions' && <Transactions data={data} setData={setData} />}
          {view === 'budgets'      && <Budgets      data={data} setData={setData} />}
          {view === 'savings'      && <Savings      data={data} setData={setData} />}
          {view === 'analytics'    && <Analytics    data={data} />}
        </div>
      </main>

      {/* Add Transaction modal */}
      {addTxOpen && (
        <AddTxModal
          onClose={() => setAddTxOpen(false)}
          onAdd={(tx) => { setData(p => ({ ...p, transactions: [tx, ...p.transactions] })); setAddTxOpen(false); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function Dashboard({ data }) {
  const { overview: ov, transactions, budgets, savings } = data;

  if (!ov) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,.35)' }}>
      <p style={{ fontSize: 36, marginBottom: 12 }}>📊</p>
      <p style={{ fontSize: 15 }}>No data yet — add your first transaction!</p>
    </div>
  );
  

  const kpis = [
    { label: 'Balance',   value: fmt(ov.balance),  sub: `${ov.savingsRate || 0}% savings rate`, color: '#6366f1', icon: '💰' },
    { label: 'Income',    value: fmt(ov.income),   sub: 'This period',                           color: '#10b981', icon: '📈' },
    { label: 'Expenses',  value: fmt(ov.expense),  sub: `${ov.count || 0} transactions`,         color: '#f59e0b', icon: '💳' },
    { label: 'Savings',   value: fmt(ov.savings),  sub: 'Deposited to goals',                    color: '#8b5cf6', icon: '🏦' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 80% 0%,${k.color}20,transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .6, fontWeight: 600 }}>{k.label}</p>
                <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{k.value}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.38)' }}>{k.sub}</p>
              </div>
              <span style={{ fontSize: 26, opacity: .7 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Mid row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Category breakdown */}
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>Spending Breakdown</p>
          {!(ov.categoryBreakdown?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No expense data yet.</p>
            : ov.categoryBreakdown.slice(0, 6).map((c, i) => {
              const cat = getCat(c._id);
              const pct = ov.expense > 0 ? Math.round((c.total / ov.expense) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>{cat.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{cat.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: '#fff' }}>{fmt(c.total)}</span>
                    </div>
                    <Bar pct={pct} color={cat.color} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontFamily: "'DM Mono',monospace", width: 30, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
        </div>

        {/* Budget health */}
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>Budget Health</p>
          {!(budgets?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No budgets yet.</p>
            : budgets.slice(0, 5).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.isOverBudget ? '#ef4444' : b.percentUsed > 80 ? '#f59e0b' : (b.color || '#6366f1'), flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>{b.name}</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: b.isOverBudget ? '#f87171' : '#fff' }}>{fmt(b.spent)}/{fmt(b.limit)}</span>
                  </div>
                  <Bar pct={b.percentUsed} color={b.isOverBudget ? '#ef4444' : b.percentUsed > 80 ? '#f59e0b' : (b.color || '#6366f1')} />
                </div>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", width: 34, textAlign: 'right', color: b.isOverBudget ? '#f87171' : b.percentUsed > 80 ? '#fbbf24' : '#34d399' }}>
                  {b.percentUsed}%
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 18 }}>
        {/* Recent transactions */}
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>Recent Transactions</p>
          {!(transactions?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No transactions yet.</p>
            : transactions.slice(0, 7).map((tx, i) => {
              const cat = getCat(tx.category);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cat.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.33)', fontFamily: "'DM Mono',monospace" }}>{cat.label} · {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: tx.type === 'income' ? '#34d399' : tx.type === 'savings' ? '#818cf8' : '#f87171', flexShrink: 0 }}>
                    {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Savings goals */}
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>Savings Goals</p>
          {!(savings?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No goals yet.</p>
            : savings.filter(g => !g.isCompleted).slice(0, 4).map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <Ring pct={g.progressPercent} color={g.color || '#10b981'} size={50} stroke={5}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{g.progressPercent}%</span>
                </Ring>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span>{g.icon}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,.33)', fontFamily: "'DM Mono',monospace" }}>
                    {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════
function Transactions({ data, setData }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const list = data.transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (search && !tx.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const del = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      setData(p => ({ ...p, transactions: p.transactions.filter(t => t._id !== id) }));
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          {['all','income','expense','savings','transfer'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="btn" style={{
              background: filter === f ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.06)',
              color: filter === f ? '#818cf8' : 'rgba(255,255,255,.45)',
              textTransform: 'capitalize', padding: '8px 14px',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
          {list.length} transactions
        </div>
        {list.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,.28)' }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>📭</p>
            <p style={{ fontSize: 14 }}>No transactions found</p>
          </div>
        )}
        {list.map((tx, i) => {
          const cat = getCat(tx.category);
          return (
            <div key={tx._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cat.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{tx.description}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.33)', fontFamily: "'DM Mono',monospace" }}>{cat.label} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <span className={`pill pill-${tx.type === 'income' ? 'income' : tx.type === 'savings' ? 'savings' : 'expense'}`}>{tx.type}</span>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono',monospace", minWidth: 88, textAlign: 'right', color: tx.type === 'income' ? '#34d399' : tx.type === 'savings' ? '#818cf8' : '#f87171' }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
              </span>
              <button onClick={() => del(tx._id)} className="btn" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: '5px 9px', fontSize: 12 }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════════════════
function Budgets({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [form,    setForm]    = useState({ name: '', category: 'food', limit: '', period: 'monthly' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const totalBudgeted = data.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent    = data.budgets.reduce((s, b) => s + b.spent, 0);

  const add = async () => {
    if (!form.name || !form.limit) return;
    setBusy(true);
    try {
      const res = await apiFetch('/budgets', { method: 'POST', body: { ...form, limit: parseFloat(form.limit) } });
      setData(p => ({ ...p, budgets: [res.budget, ...p.budgets] }));
      setShowAdd(false); setForm({ name: '', category: 'food', limit: '', period: 'monthly' });
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete budget?')) return;
    try { await apiFetch(`/budgets/${id}`, { method: 'DELETE' }); setData(p => ({ ...p, budgets: p.budgets.filter(b => b._id !== id) })); }
    catch (e) { alert(e.message); }
  };

  const EXPENSE_CATS = ['food','transport','housing','utilities','healthcare','entertainment','shopping','education','travel','personal','insurance','debt','subscriptions','gifts','other_expense'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[['Total Budgeted', totalBudgeted, '#6366f1'], ['Total Spent', totalSpent, '#f59e0b'], ['Remaining', totalBudgeted - totalSpent, '#10b981']].map(([l, v, c]) => (
          <div key={l} className="card" style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .5 }}>{l}</p>
            <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: c }}>{fmt(v)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(p => !p)} className="btn" style={{ background: 'rgba(99,102,241,.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,.3)' }}>
          {showAdd ? '✕ Cancel' : '+ New Budget'}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Create Budget</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input" placeholder="Budget name" value={form.name} onChange={set('name')} />
            <select className="input" value={form.category} onChange={set('category')}>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{getCat(c).emoji} {getCat(c).label}</option>)}
            </select>
            <input className="input" type="number" placeholder="Limit ($)" value={form.limit} onChange={set('limit')} />
            <select className="input" value={form.period} onChange={set('period')}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button onClick={add} disabled={busy} className="btn" style={{ marginTop: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            {busy ? 'Creating…' : 'Create Budget'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {data.budgets.length === 0
          ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>No budgets yet.</p>
          : data.budgets.map((b) => {
            const cat  = getCat(b.category);
            const bar  = b.isOverBudget ? '#ef4444' : b.percentUsed > 80 ? '#f59e0b' : (b.color || '#6366f1');
            return (
              <div key={b._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: `${b.color || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{cat.emoji}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)', textTransform: 'capitalize' }}>{b.period}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {b.isOverBudget && <span className="pill" style={{ background: 'rgba(239,68,68,.15)', color: '#f87171' }}>Over!</span>}
                    <button onClick={() => del(b._id)} className="btn" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: '4px 8px', fontSize: 11 }}>✕</button>
                  </div>
                </div>
                <Bar pct={b.percentUsed} color={bar} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{fmt(b.spent)} spent</span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: bar }}>{b.percentUsed}% of {fmt(b.limit)}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVINGS
// ═══════════════════════════════════════════════════════════════════════════
function Savings({ data, setData }) {
  const [depositGoal, setDepositGoal] = useState(null);
  const [depositAmt,  setDepositAmt]  = useState('');
  const [showAdd,     setShowAdd]     = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [form,        setForm]        = useState({ name: '', targetAmount: '', icon: '🎯', category: 'other', targetDate: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const savings = data?.savings || [];

const totalSaved = savings.reduce(
  (s, g) => s + (g.currentAmount || 0),
  0
);

const totalTarget = savings.reduce(
  (s, g) => s + (g.targetAmount || 0),
  0
);
  const pctOverall  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const deposit = async () => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) return;
    try {
      const res = await apiFetch(`/savings/${depositGoal._id}/deposit`, { method: 'POST', body: { amount: amt } });
      setData(p => ({ ...p, savings: p.savings.map(g => g._id === depositGoal._id ? res.goal : g) }));
      setDepositGoal(null); setDepositAmt('');
    } catch (e) { alert(e.message); }
  };
  console.log("Updated goal:", res.goal);

  const addGoal = async () => {
    if (!form.name || !form.targetAmount) return;
    setBusy(true);
    try {
      const res = await apiFetch('/savings', {
        method: 'POST',
        body: { ...form, targetAmount: parseFloat(form.targetAmount), targetDate: form.targetDate || new Date(Date.now() + 365 * 86400000).toISOString() },
      });
      setData(p => ({ ...p, savings: [res.goal, ...p.savings] }));
      setShowAdd(false); setForm({ name: '', targetAmount: '', icon: '🎯', category: 'other', targetDate: '' });
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete goal?')) return;
    try { await apiFetch(`/savings/${id}`, { method: 'DELETE' }); setData(p => ({ ...p, savings: p.savings.filter(g => g._id !== id) })); }
    catch (e) { alert(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero */}
      <div className="card" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.14),rgba(99,102,241,.1))', borderColor: 'rgba(16,185,129,.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: .6 }}>Total Saved</p>
            <p style={{ margin: '8px 0 4px', fontSize: 34, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: '#34d399' }}>{fmt(totalSaved)}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.38)' }}>of {fmt(totalTarget)} target · {pctOverall}% overall</p>
          </div>
          <Ring pct={pctOverall} color="#10b981" size={86} stroke={8}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{pctOverall}%</span>
          </Ring>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(p => !p)} className="btn" style={{ background: 'rgba(16,185,129,.14)', color: '#34d399', border: '1px solid rgba(16,185,129,.25)' }}>
          {showAdd ? '✕ Cancel' : '+ New Goal'}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Create Savings Goal</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input" placeholder="Goal name" value={form.name} onChange={set('name')} />
            <input className="input" type="number" placeholder="Target amount ($)" value={form.targetAmount} onChange={set('targetAmount')} />
            <input className="input" placeholder="Icon emoji" value={form.icon} onChange={set('icon')} style={{ fontSize: 20 }} />
            <input className="input" type="date" value={form.targetDate} onChange={set('targetDate')} />
            <select className="input" value={form.category} onChange={set('category')}>
              {['emergency_fund','vacation','house','car','education','wedding','retirement','investment','gadget','medical','other'].map(c => (
                <option key={c} value={c}>{c.replace('_',' ')}</option>
              ))}
            </select>
          </div>
          <button onClick={addGoal} disabled={busy} className="btn" style={{ marginTop: 14, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
            {busy ? 'Creating…' : 'Create Goal'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {data.savings.length === 0
          ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14 }}>No savings goals yet.</p>
          : data.savings.map((g) => (
            <div key={g._id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 90% 0%,${g.color || '#10b981'}18,transparent 60%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>{g.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{g.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{g.daysLeft}d left · {fmt(g.requiredMonthly)}/mo needed</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Ring pct={g.progressPercent} color={g.color || '#10b981'} size={52} stroke={5}>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{g.progressPercent}%</span>
                  </Ring>
                  <button onClick={() => del(g._id)} className="btn" style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', padding: '4px 8px', fontSize: 11 }}>✕</button>
                </div>
              </div>
              <Bar pct={g.progressPercent} color={g.color || '#10b981'} height={6} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmt(g.currentAmount)}<span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', fontWeight: 400 }}> / {fmt(g.targetAmount)}</span></span>
                <button onClick={() => setDepositGoal(g)} className="btn" style={{ background: `${g.color || '#10b981'}25`, color: g.color || '#10b981', border: `1px solid ${g.color || '#10b981'}40`, padding: '6px 13px', fontSize: 12 }}>
                  + Deposit
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Deposit modal */}
      {depositGoal && (
        <div className="modal-bg" onClick={() => setDepositGoal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 20, fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 6 }}>{depositGoal.icon} Deposit to {depositGoal.name}</p>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 22 }}>{fmt(depositGoal.currentAmount)} saved of {fmt(depositGoal.targetAmount)}</p>
            <input type="number" placeholder="Amount ($)" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} className="input" style={{ marginBottom: 16 }} autoFocus />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={deposit} className="btn" style={{ flex: 1, padding: 13, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 14 }}>Confirm Deposit</button>
              <button onClick={() => setDepositGoal(null)} className="btn" style={{ padding: 13, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
function Analytics({ data }) {
  const [comparison, setComparison] = useState([]);

  useEffect(() => {
    apiFetch('/analytics/monthly-comparison?months=6')
      .then(r => setComparison(r.comparison || []))
      .catch(() => {});
  }, []);

  const maxVal = Math.max(...comparison.map(m => m.income), 1);
  const { overview: ov, savings } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Bar chart */}
      <div className="card">
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>6-Month Income vs Expenses</p>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Real data from your transactions</p>
        {comparison.length === 0
          ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Add more transactions to see trends.</p>
          : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 140 }}>
              {comparison.map((m, i) => {
                const incH = (m.income  / maxVal) * 120;
                const expH = (m.expense / maxVal) * 120;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#34d399', fontFamily: "'DM Mono',monospace" }}>{m.savingsRate}%</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                      <div style={{ width: 12, height: Math.max(incH, 2), background: '#6366f1', borderRadius: '3px 3px 0 0', opacity: .85, marginTop: `${120 - incH}px` }} />
                      <div style={{ width: 12, height: Math.max(expH, 2), background: '#f59e0b', borderRadius: '3px 3px 0 0', opacity: .85, marginTop: `${120 - expH}px` }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>{m.label?.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          {[['#6366f1','Income'],['#f59e0b','Expenses']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category + Savings side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Category Breakdown (This Month)</p>
          {!(ov?.categoryBreakdown?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No data yet.</p>
            : ov.categoryBreakdown.map((c, i) => {
              const cat = getCat(c._id);
              const pct = ov.expense > 0 ? Math.round((c.total / ov.expense) * 100) : 0;
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', display: 'flex', gap: 6, alignItems: 'center' }}><span>{cat.emoji}</span>{cat.label}</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: 'rgba(255,255,255,.5)' }}>{fmt(c.total)} · {pct}%</span>
                  </div>
                  <Bar pct={pct} color={cat.color} height={6} />
                </div>
              );
            })}
        </div>

        <div className="card">
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Goal Projections</p>
          {!(savings?.length)
            ? <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>No goals yet.</p>
            : savings.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{g.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                    <span style={{ fontSize: 11, color: g.daysLeft < 60 ? '#fbbf24' : '#34d399', fontFamily: "'DM Mono',monospace" }}>{g.daysLeft}d left</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0 5px' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.33)' }}>{fmt(g.requiredMonthly)}/mo needed</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.33)' }}>{g.progressPercent}%</span>
                  </div>
                  <Bar pct={g.progressPercent} color={g.color || '#10b981'} height={5} />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD TRANSACTION MODAL
// ═══════════════════════════════════════════════════════════════════════════
function AddTxModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ type: 'expense', category: 'food', amount: '', description: '', paymentMethod: 'card', date: new Date().toISOString().split('T')[0] });
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const cats = {
    expense:  ['food','transport','housing','utilities','healthcare','entertainment','shopping','education','personal','insurance','debt','subscriptions','gifts','other_expense'],
    income:   ['salary','freelance','investment','bonus','rental','other_income'],
    savings:  ['savings_deposit'],
    transfer: ['transfer'],
  };

  const submit = async () => {
    if (!form.amount || !form.description) return;
    setBusy(true);
    try {
      const res = await apiFetch('/transactions', { method: 'POST', body: { ...form, amount: parseFloat(form.amount) } });
      onAdd(res.transaction);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 20, fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 6 }}>Add Transaction</p>
        <p style={{ color: 'rgba(255,255,255,.38)', fontSize: 13, marginBottom: 22 }}>Record income, expense, or savings</p>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['expense','income','savings','transfer'].map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, type: t, category: cats[t][0] }))} className="btn"
              style={{ flex: 1, padding: '9px 0',
                background: form.type === t
                  ? t === 'income' ? 'rgba(16,185,129,.25)' : t === 'savings' ? 'rgba(99,102,241,.25)' : t === 'transfer' ? 'rgba(148,163,184,.2)' : 'rgba(239,68,68,.22)'
                  : 'rgba(255,255,255,.06)',
                color: form.type === t
                  ? t === 'income' ? '#34d399' : t === 'savings' ? '#818cf8' : t === 'transfer' ? '#94a3b8' : '#f87171'
                  : 'rgba(255,255,255,.38)',
                textTransform: 'capitalize', fontSize: 12,
              }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" type="number" placeholder="Amount ($)" value={form.amount} onChange={set('amount')} />
          <input className="input" placeholder="Description" value={form.description} onChange={set('description')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select className="input" value={form.category} onChange={set('category')}>
              {(cats[form.type] || cats.expense).map(c => <option key={c} value={c}>{getCat(c).emoji} {getCat(c).label}</option>)}
            </select>
            <select className="input" value={form.paymentMethod} onChange={set('paymentMethod')}>
              {['card','cash','bank_transfer','mobile_money','crypto','other'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <input className="input" type="date" value={form.date} onChange={set('date')} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={submit} disabled={busy} className="btn" style={{ flex: 1, padding: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14 }}>
            {busy ? 'Saving…' : 'Add Transaction'}
          </button>
          <button onClick={onClose} className="btn" style={{ padding: 13, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: 14 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}