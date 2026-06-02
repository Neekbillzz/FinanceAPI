import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import BudgetForm from "./components/BudgetForm";

// ─── Mock API Layer (replace with real fetch calls) ───────────────────────
const API_BASE = "http://localhost:5000/api";
const getToken  = ()        => localStorage.getItem('fintrack_token');
const setToken  = (token)   => localStorage.setItem('fintrack_token', token);
const clearToken = ()       => localStorage.removeItem('fintrack_token');

// Central fetch wrapper — attaches JWT automatically
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
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

/*const mockData = {
  user: { name: "Alex Morgan", email: "alex@example.com", role: "user", currency: "USD", monthlyIncome: 5200, lowBalanceThreshold: 200 },
  overview: {
    income: 5200, expense: 3180, savings: 820, balance: 2020, savingsRate: 39, count: 47,
    categoryBreakdown: [
      { _id: "food", total: 680 }, { _id: "transport", total: 420 }, { _id: "housing", total: 1200 },
      { _id: "entertainment", total: 340 }, { _id: "shopping", total: 280 }, { _id: "utilities", total: 180 },
      { _id: "healthcare", total: 80 },
    ],
    dailyTrend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 4, i + 1).toISOString().split("T")[0],
      income: i % 7 === 0 ? 1300 : 0,
      expense: 80 + Math.random() * 120,
    })),
  },
  transactions: [
    { _id: "1", type: "income", category: "salary", amount: 5200, description: "Monthly Salary", date: "2026-05-01", paymentMethod: "bank_transfer" },
    { _id: "2", type: "expense", category: "housing", amount: 1200, description: "Rent Payment", date: "2026-05-02", paymentMethod: "bank_transfer" },
    { _id: "3", type: "expense", category: "food", amount: 67, description: "Grocery Store", date: "2026-05-03", paymentMethod: "card" },
    { _id: "4", type: "savings", category: "savings_deposit", amount: 500, description: "Emergency Fund", date: "2026-05-04", paymentMethod: "bank_transfer" },
    { _id: "5", type: "expense", category: "transport", amount: 45, description: "Uber Rides", date: "2026-05-05", paymentMethod: "card" },
    { _id: "6", type: "expense", category: "entertainment", amount: 89, description: "Netflix + Spotify", date: "2026-05-06", paymentMethod: "card" },
    { _id: "7", type: "expense", category: "food", amount: 124, description: "Restaurant", date: "2026-05-08", paymentMethod: "card" },
    { _id: "8", type: "expense", category: "shopping", amount: 156, description: "Amazon Order", date: "2026-05-10", paymentMethod: "card" },
    { _id: "9", type: "expense", category: "healthcare", amount: 80, description: "Doctor Visit", date: "2026-05-12", paymentMethod: "card" },
    { _id: "10", type: "savings", category: "savings_deposit", amount: 320, description: "Vacation Fund", date: "2026-05-15", paymentMethod: "bank_transfer" },
  ],
  budgets: [
    { _id: "b1", name: "Food & Dining", category: "food", limit: 800, spent: 680, period: "monthly", percentUsed: 85, remaining: 120, color: "#f59e0b" },
    { _id: "b2", name: "Transportation", category: "transport", limit: 500, spent: 420, period: "monthly", percentUsed: 84, remaining: 80, color: "#3b82f6" },
    { _id: "b3", name: "Entertainment", category: "entertainment", limit: 300, spent: 340, period: "monthly", percentUsed: 113, remaining: 0, color: "#8b5cf6", isOverBudget: true },
    { _id: "b4", name: "Shopping", category: "shopping", limit: 400, spent: 280, period: "monthly", percentUsed: 70, remaining: 120, color: "#ec4899" },
    { _id: "b5", name: "Utilities", category: "utilities", limit: 200, spent: 180, period: "monthly", percentUsed: 90, remaining: 20, color: "#14b8a6" },
  ],
  savings: [
    { _id: "s1", name: "Emergency Fund", targetAmount: 10000, currentAmount: 6800, progressPercent: 68, daysLeft: 180, icon: "🛡️", color: "#10b981", category: "emergency_fund", requiredMonthly: 622 },
    { _id: "s2", name: "Dream Vacation", targetAmount: 3500, currentAmount: 1820, progressPercent: 52, daysLeft: 90, icon: "✈️", color: "#3b82f6", category: "vacation", requiredMonthly: 187 },
    { _id: "s3", name: "New Laptop", targetAmount: 1800, currentAmount: 1440, progressPercent: 80, daysLeft: 45, icon: "💻", color: "#8b5cf6", category: "gadget", requiredMonthly: 80 },
    { _id: "s4", name: "Down Payment", targetAmount: 50000, currentAmount: 12500, progressPercent: 25, daysLeft: 730, icon: "🏠", color: "#f59e0b", category: "house", requiredMonthly: 1027 },
  ],
  notifications: [
    { _id: "n1", type: "budget_exceeded", title: "🚨 Over Budget: Entertainment", message: "You've exceeded your Entertainment budget by $40.", severity: "error", isRead: false, createdAt: new Date().toISOString() },
    { _id: "n2", type: "savings_milestone", title: "🏆 80% Milestone: New Laptop", message: "Amazing! You're 80% of the way to your laptop goal.", severity: "success", isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { _id: "n3", type: "budget_approaching", title: "Budget Alert: Utilities", message: "You've used 90% of your Utilities budget.", severity: "warning", isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { _id: "n4", type: "savings_update", title: "📊 Weekly Savings Report", message: "4 active goals. Overall progress: 56%.", severity: "info", isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
};*/

// ─── Category meta ─────────────────────────────────────────────────────────
const CATEGORY_META = {
  food: { label: "Food & Dining", emoji: "🍽️", color: "#f59e0b" },
  transport: { label: "Transport", emoji: "🚗", color: "#3b82f6" },
  housing: { label: "Housing", emoji: "🏠", color: "#6366f1" },
  utilities: { label: "Utilities", emoji: "💡", color: "#14b8a6" },
  healthcare: { label: "Healthcare", emoji: "🏥", color: "#ef4444" },
  entertainment: { label: "Entertainment", emoji: "🎬", color: "#8b5cf6" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "#ec4899" },
  education: { label: "Education", emoji: "📚", color: "#0ea5e9" },
  travel: { label: "Travel", emoji: "✈️", color: "#10b981" },
  personal: { label: "Personal", emoji: "👤", color: "#94a3b8" },
  salary: { label: "Salary", emoji: "💼", color: "#10b981" },
  savings_deposit: { label: "Savings", emoji: "💰", color: "#6366f1" },
  other_expense: { label: "Other", emoji: "📦", color: "#78716c" },
};

const getCatMeta = (cat) => CATEGORY_META[cat] || { label: cat, emoji: "📊", color: "#6366f1" };

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Micro Chart ───────────────────────────────────────────────────────────
const SparkLine = ({ data, color = "#6366f1", height = 40 }) => {
  if (!data?.length) return null;
  const values = data.map(d => d.expense || d.amount || 0);
  const max = Math.max(...values, 1);
  const w = 120, h = height;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
};

// ─── Radial Progress ───────────────────────────────────────────────────────
const RadialProgress = ({ percent, color, size = 80, strokeWidth = 7, children }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      {children && (
        <foreignObject x={strokeWidth} y={strokeWidth} width={size-strokeWidth*2} height={size-strokeWidth*2}>
          <div style={{ transform:"rotate(90deg)", width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

// ─── Bar Chart ─────────────────────────────────────────────────────────────
const BarChart = ({ data, valueKey = "total", labelKey = "_id", color }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, padding: "0 4px" }}>
      {data.slice(0, 7).map((d, i) => {
        const meta = getCatMeta(d[labelKey]);
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
              ${Math.round(d[valueKey])}
            </span>
            <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", height: 70 }}>
              <div style={{
                height: `${pct}%`, width: "100%", background: color || meta.color,
                borderRadius: "4px 4px 0 0", marginTop: `${100-pct}%`,
                transition: "height 0.8s ease", opacity: 0.85,
              }} />
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{meta.emoji}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Login Screen ──────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "demo@fintrack.com", password: "demo1234" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
  e.preventDefault();
  setLoading(true); setErr('');
  try {
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const body = isRegister
      ? { name: form.name, email: form.email, password: form.password }
      : { email: form.email, password: form.password };

    const data = await apiFetch(endpoint, { method: 'POST', body });

    setToken(data.accessToken);           // ← saves JWT to localStorage
    onLogin(data.user);                   // ← passes user object up to App
  } catch (err) {
    setErr(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* Background orbs */}
      {["#6366f1","#10b981","#f59e0b"].map((c,i) => (
        <div key={i} style={{
          position:"absolute", borderRadius:"50%",
          width: 400+i*100, height: 400+i*100,
          background: `radial-gradient(circle, ${c}22 0%, transparent 70%)`,
          left: `${[10,50,70][i]}%`, top: `${[20,60,10][i]}%`,
          transform: "translate(-50%,-50%)",
          animation: `pulse ${4+i}s ease-in-out infinite alternate`,
        }} />
      ))}

      <style>{`
        @keyframes pulse { from { transform: translate(-50%,-50%) scale(1); } to { transform: translate(-50%,-50%) scale(1.15); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
        .login-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; color: #fff; font-size: 15px; font-family: 'DM Sans', sans-serif; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
        .login-input:focus { border-color: #6366f1; }
        .login-btn { width:100%; padding: 15px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 12px; color: #fff; font-size: 16px; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
        .login-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .login-btn:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }
      `}</style>

      <div style={{
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 48,
        width: 400, position: "relative", zIndex: 10, animation: "slideUp 0.5s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💎</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>FinTrack</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: "6px 0 0" }}>Smart personal finance</p>
        </div>

        {err && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", color: "#fca5a5", fontSize: 14, marginBottom: 20 }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isRegister && (
            <input className="login-input" placeholder="Full name" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          )}
          <input className="login-input" type="email" placeholder="Email address" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <input className="login-input" type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />

          <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Authenticating…" : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
            {isRegister ? "Already have an account? " : "No account yet? "}
          </span>
          <button onClick={() => setIsRegister(p => !p)} style={{
            background: "none", border: "none", color: "#818cf8", fontSize: 14,
            cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          }}>
            {isRegister ? "Sign in" : "Register"}
          </button>
        </div>

        <div style={{ marginTop: 28, padding: "16px", background: "rgba(99,102,241,0.08)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.2)" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0, textAlign: "center", fontFamily: "'DM Mono', monospace" }}>
            Demo: demo@fintrack.com / demo1234
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [data, setData] = useState({
  overview: null, transactions: [], budgets: [], savings: [], notifications: []
});
const [loading, setLoading] = useState(true);

// Add this useEffect right after the useState declarations:
useEffect(() => {
  if (!user) return;
  const loadAll = async () => {
    setLoading(true);
    try {
      // All 5 fetches run in parallel — much faster than sequential
      const [overview, txRes, budgetRes, savingsRes, notifRes] = await Promise.all([
        
        apiFetch('/analytics/overview?period=month'),
        apiFetch('/transactions?limit=20&sort=-date'),
        apiFetch('/budgets?isActive=true'),
        apiFetch('/savings'),
        apiFetch('/notifications?limit=20'),
      ]);
      console.log({
  overview,
  txRes,
  budgetRes,
  savingsRes,
  notifRes
});
      console.log("Overview response:", JSON.stringify(overview, null, 2));
      setData({
  overview: overview?.overview || {},
  transactions: txRes?.transactions || [],
  budgets: budgetRes?.budgets || [],
  savings: savingsRes?.goals || [],
  notifications: notifRes?.notifications || [],
});
    } catch (err) {
      console.error('Failed to load dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };
  loadAll();
}, [user]); 
  const [notifOpen, setNotifOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(null); // 'transaction' | 'budget' | 'savings'
  const [animIn, setAnimIn] = useState(true);

  const unread = data.notifications.filter(n => !n.isRead).length;

  const navigate = (view) => {
    setAnimIn(false);
    setTimeout(() => { setActiveView(view); setAnimIn(true); }, 150);
  };

  const markAllRead = async () => {
  try {
    await apiFetch('/notifications/read-all', { method: 'PUT' });
    setData(p => ({
      ...p,
      notifications: p.notifications.map(n => ({ ...n, isRead: true })),
    }));
  } catch (err) {
    console.error('Failed to mark read:', err.message);
  }
  setNotifOpen(false);
};

  if (!user) return <LoginScreen onLogin={setUser} />;

  const navItems = [
    { id: "dashboard", label: "Dashboard", emoji: "📊" },
    { id: "transactions", label: "Transactions", emoji: "💳" },
    { id: "budgets", label: "Budgets", emoji: "📁" },
    { id: "savings", label: "Savings", emoji: "🏦" },
    { id: "analytics", label: "Analytics", emoji: "📈" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#080c14", color: "#fff",
      fontFamily: "'DM Sans', sans-serif", display: "flex",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { from { background-position: -200px 0; } to { background-position: calc(200px + 100%) 0; } }
        .nav-item { display:flex; align-items:center; gap:10px; padding:11px 16px; border-radius:12px; cursor:pointer; font-size:14px; font-weight:500; color:rgba(255,255,255,0.45); transition:all 0.2s; border:none; background:none; width:100%; text-align:left; }
        .nav-item:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.8); }
        .nav-item.active { background:rgba(99,102,241,0.18); color:#818cf8; }
        .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:24px; }
        .card-sm { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px; }
        .tag { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; font-family:'DM Mono', monospace; }
        .pill-income { background:rgba(16,185,129,0.15); color:#34d399; }
        .pill-expense { background:rgba(239,68,68,0.15); color:#f87171; }
        .pill-savings { background:rgba(99,102,241,0.15); color:#818cf8; }
        .action-btn { padding:10px 18px; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .action-btn:hover { transform:translateY(-1px); }
        .progress-bar { height:8px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); z-index:100; display:flex; align-items:center; justifyContent:center; }
        .modal { background:#111827; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:32px; width:480px; max-width:94vw; }
        .form-input { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 14px; color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; width:100%; outline:none; transition:border-color 0.2s; }
        .form-input:focus { border-color:#6366f1; }
        select.form-input option { background:#1a2035; }
      `}</style>

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: 220, minHeight: "100vh", padding: "28px 16px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 8, marginBottom: 36 }}>
          <span style={{ fontSize: 22 }}>💎</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff" }}>FinTrack</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}>
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "16px 8px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {user.name[0]}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>{user.role}</p>
            </div>
          </div>
          <button onClick={() => { clearToken(); setUser(null); }}style={{
            marginTop: 14, width: "100%", padding: "9px", background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171",
            fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 500,
          }}>Sign Out</button>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {/* Top Bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0, background: "#080c14", zIndex: 50,
        }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700 }}>
              {navItems.find(n => n.id === activeView)?.emoji} {navItems.find(n => n.id === activeView)?.label}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setAddModalOpen("transaction")} style={{
              padding: "9px 18px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}>+ Add Transaction</button>

            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifOpen(p => !p)} style={{
                width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 17,
                display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
              }}>
                🔔
                {unread > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -4, width: 18, height: 18,
                    background: "#ef4444", borderRadius: "50%", fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  }}>{unread}</span>
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: "absolute", right: 0, top: 48, width: 360,
                  background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16, zIndex: 200, overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>Notifications</span>
                    <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto" }}>
                    {data.notifications.map(n => (
                      <div key={n._id} style={{
                        padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: n.isRead ? "transparent" : "rgba(99,102,241,0.06)",
                        cursor: "pointer",
                      }}
                        onClick={() => setData(p => ({ ...p, notifications: p.notifications.map(x => x._id === n._id ? { ...x, isRead: true } : x) }))}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: n.isRead ? "rgba(255,255,255,0.6)" : "#fff" }}>{n.title}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{n.message}</p>
                          </div>
                          {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 4 }} />}
                        </div>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", display: "block", marginTop: 6 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Content */}
        <div style={{ padding: 32, animation: animIn ? "fadeSlide 0.3s ease" : "none" }}>
          {activeView === "dashboard" && <DashboardView data={data} user={user} />}
          {activeView === "transactions" && <TransactionsView data={data} setData={setData} />}
          {activeView === "budgets" && <BudgetsView data={data} setData={setData} />}
          {activeView === "savings" && <SavingsView data={data} setData={setData} />}
          {activeView === "analytics" && <AnalyticsView data={data} />}
        </div>
      </div>

      {/* ─── Add Transaction Modal ────────────────────────────────────────── */}
      {addModalOpen === "transaction" && (
        <AddTransactionModal
          onClose={() => setAddModalOpen(null)}
          onAdd={(tx) => {
            setData(p => ({ ...p, transactions: [{ ...tx, _id: Date.now().toString(), date: new Date().toISOString() }, ...p.transactions] }));
            setAddModalOpen(null);
          }}
        />
      )}

      {notifOpen && <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setNotifOpen(false)} />}
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────────────────────
const DashboardView = ({ data, user, loading }) => {
  const { overview, transactions, budgets, savings, notifications } = data;
  if (loading) {
    return (
      <div className="card">
        <h3>Loading dashboard...</h3>
      </div>
    );
  }

  const activeSavings = savings.filter(s => !s.isCompleted);
  console.log("transactions", transactions);
console.log("budgets", budgets);
console.log("savings", savings);
console.log("notifications", notifications);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Total Balance", value: fmt(overview.balance), sub: `+${overview.savingsRate}% savings rate`, color: "#6366f1", icon: "💰", trend: "up" },
          { label: "Income", value: fmt(overview.income), sub: "This month", color: "#10b981", icon: "📈", trend: "up" },
          { label: "Expenses", value: fmt(overview.expense), sub: `${overview.count} transactions`, color: "#f59e0b", icon: "💳", trend: "neutral" },
          { label: "Saved", value: fmt(overview.savings), sub: "Added to goals", color: "#8b5cf6", icon: "🏦", trend: "up" },
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top right, ${kpi.color}18, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{kpi.label}</p>
                <p style={{ margin: "8px 0 4px", fontSize: 26, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: "#fff" }}>{kpi.value}</p>
                <p style={{ margin: 0, fontSize: 12, color: kpi.trend === "up" ? "#34d399" : "rgba(255,255,255,0.35)" }}>{kpi.sub}</p>
              </div>
              <div style={{ fontSize: 28, opacity: 0.7 }}>{kpi.icon}</div>
            </div>
            <div style={{ marginTop: 16, position: "relative" }}>
              <SparkLine data={overview.dailyTrend.slice(-15) || 'No date'} color={kpi.color} height={36} />
            </div>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Spending by Category */}
        <div className="card">
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Spending Breakdown</h3>
          <BarChart data={overview.categoryBreakdown} valueKey="total" labelKey="_id" />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {overview.categoryBreakdown.slice(0, 4).map((c, i) => {
              const meta = getCatMeta(c._id);
              const pct = Math.round((c.total / overview.expense) * 100);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{meta.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{meta.label}</span>
                      <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#fff" }}>{fmt(c.total)}</span>
                    </div>
                    <div className="progress-bar">
                      <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 10, transition: "width 1s ease" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", width: 32, textAlign: "right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Health */}
        <div className="card">
          <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Budget Health</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.budgets.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{b.name}</span>
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: b.isOverBudget ? "#f87171" : "#fff" }}>
                      {fmt(b.spent)} / {fmt(b.limit)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div style={{
                      height: "100%", width: `${Math.min(b.percentUsed, 100)}%`,
                      background: b.isOverBudget ? "#ef4444" : b.percentUsed > 80 ? "#f59e0b" : b.color,
                      borderRadius: 10, transition: "width 1s ease",
                    }} />
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontFamily: "'DM Mono',monospace",
                  color: b.isOverBudget ? "#f87171" : b.percentUsed > 80 ? "#fbbf24" : "#34d399",
                  width: 38, textAlign: "right",
                }}>{b.percentUsed}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Recent Transactions */}
        <div className="card">
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Recent Transactions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {transactions.slice(0, 6).map((tx, i) => {
              const meta = getCatMeta(tx.category);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>{meta.label} · {new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 600, fontFamily: "'DM Mono',monospace",
                    color: tx.type === "income" ? "#34d399" : tx.type === "savings" ? "#818cf8" : "#f87171",
                  }}>
                    {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Savings Goals */}
        <div className="card">
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Savings Goals</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {activeSavings.slice(0, 3).map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RadialProgress percent={g.progressPercent} color={g.color} size={52} strokeWidth={5}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{g.progressPercent}%</span>
                </RadialProgress>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{g.icon}</span>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff" }}>{g.name}</p>
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>
                    {fmt(g.currentAmount)} of {fmt(g.targetAmount)} · {g.daysLeft}d left
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TRANSACTIONS VIEW ─────────────────────────────────────────────────────
const TransactionsView = ({ data, setData }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const txs = data.transactions.filter(tx => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="🔍 Search transactions…" value={search} onChange={e => setSearch(e.target.value)}
            className="form-input" style={{ flex: 1, minWidth: 200 }} />
          {["all","income","expense","savings"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: filter === f ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
              color: filter === f ? "#818cf8" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{txs.length} transactions</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>
            Total: {fmt(txs.reduce((s,t) => t.type==="income"?s+t.amount:s-t.amount, 0))}
          </span>
        </div>
        {txs.map((tx, i) => {
          const meta = getCatMeta(tx.category);
          return (
            <div key={tx._id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
              borderBottom: i < txs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {meta.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#fff" }}>{tx.description}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>
                  {meta.label} · {new Date(tx.date).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`tag ${tx.type === "income" ? "pill-income" : tx.type === "savings" ? "pill-savings" : "pill-expense"}`}>
                  {tx.type}
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono',monospace", minWidth: 90, textAlign: "right",
                  color: tx.type === "income" ? "#34d399" : tx.type === "savings" ? "#818cf8" : "#f87171",
                }}>
                  {tx.type === "income" ? "+" : "−"}{fmt(tx.amount)}
                </span>
              </div>
            </div>
          );
        })}
        {txs.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>📭</p>
            <p style={{ margin: 0, fontSize: 14 }}>No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── BUDGETS VIEW ──────────────────────────────────────────────────────────
const BudgetsView = ({ data, setData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "food", limit: "", period: "monthly", color: "#6366f1" });

  const totalBudgeted = data.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = data.budgets.reduce((s, b) => s + b.spent, 0);

  const addBudget = async () => {
  if (!form.name || !form.limit) return;
  try {
    const now = new Date();
    const res = await apiFetch('/budgets', {
      method: 'POST',
      body: {
        ...form,
        limit: parseFloat(form.limit),
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      },
    });
    setData(p => ({ ...p, budgets: [res.budget, ...p.budgets] }));
    setShowAdd(false);
    setForm({ name: '', category: 'food', limit: '', period: 'monthly' });
  } catch (err) {
    alert(err.message);
  }
};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { label: "Total Budgeted", value: fmt(totalBudgeted), color: "#6366f1" },
          { label: "Total Spent", value: fmt(totalSpent), color: "#f59e0b" },
          { label: "Remaining", value: fmt(totalBudgeted - totalSpent), color: "#10b981" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</p>
            <p style={{ margin: "10px 0 0", fontSize: 24, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowAdd(p => !p)} className="action-btn"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
          {showAdd ? "✕ Cancel" : "+ New Budget"}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 style={{ margin: "0 0 18px", fontSize: 15 }}>Create Budget</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Budget name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="form-input" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="form-input">
              {["food","transport","housing","utilities","healthcare","entertainment","shopping","education","personal"].map(c => (
                <option key={c} value={c}>{getCatMeta(c).emoji} {getCatMeta(c).label}</option>
              ))}
            </select>
            <input placeholder="Monthly limit ($)" type="number" value={form.limit} onChange={e => setForm(p => ({ ...p, limit: e.target.value }))} className="form-input" />
            <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="form-input">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button onClick={addBudget} className="action-btn" style={{ marginTop: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
            Create Budget
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {data.budgets.map((b, i) => {
          const meta = getCatMeta(b.category);
          const pct = b.percentUsed;
          const barColor = b.isOverBudget ? "#ef4444" : pct > 80 ? "#f59e0b" : b.color;
          return (
            <div key={b._id} className="card" style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${b.color}20, transparent)`, borderRadius: "0 18px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${b.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {meta.emoji}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{b.period}</p>
                  </div>
                </div>
                {b.isOverBudget && <span className="tag" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>Over!</span>}
              </div>

              <div className="progress-bar" style={{ marginBottom: 10 }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 10, transition: "width 1s ease" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {fmt(b.spent)} spent
                </span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: barColor }}>
                  {pct}% of {fmt(b.limit)}
                </span>
              </div>

              {!b.isOverBudget && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {fmt(b.remaining)} remaining
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SAVINGS VIEW ──────────────────────────────────────────────────────────
const SavingsView = ({ data, setData }) => {
  const [depositGoal, setDepositGoal] = useState(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", icon: "🎯", category: "other", targetDate: "" });

  const totalSaved = savings.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = savings.reduce((s, g) => s + g.targetAmount, 0);

  const handleDeposit = async () => {
  const amt = parseFloat(depositAmt);
  if (!amt || amt <= 0) return;

  try {
    await apiFetch(`/savings/${depositGoal._id}/deposit`, {
      method: 'POST',
      body: { amount: amt, note: '' },
    });

    const savingsRes = await apiFetch('/savings');

    setData(p => ({
      ...p,
      savings: savingsRes.goals || savingsRes.savings || []
    }));

    setDepositGoal(null);
    setDepositAmt('');
  } catch (err) {
    alert(err.message);
  }
};

  const addGoal = async () => {
  try {
    await apiFetch('/savings', {
      method: 'POST',
      body: {
        ...form,
        targetAmount: parseFloat(form.targetAmount),
        targetDate:
          form.targetDate ||
          new Date(Date.now() + 365 * 86400000).toISOString(),
      },
    });

    const refreshed = await apiFetch('/savings');

    setData(p => ({
      ...p,
      savings: refreshed.goals || refreshed.savings || []
    }));

    setShowAdd(false);

  } catch (e) {
    alert(e.message);
  }
};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary */}
      <div className="card" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.1))", borderColor: "rgba(16,185,129,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Saved</p>
            <p style={{ margin: "8px 0 4px", fontSize: 36, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#34d399" }}>{fmt(totalSaved)}</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>of {fmt(totalTarget)} goal · {Math.round((totalSaved/totalTarget)*100)}% overall</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <RadialProgress percent={Math.round((totalSaved/totalTarget)*100)} color="#10b981" size={90} strokeWidth={8}>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                {Math.round((totalSaved/totalTarget)*100)}%
              </span>
            </RadialProgress>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowAdd(p => !p)} className="action-btn"
          style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
          {showAdd ? "✕ Cancel" : "+ New Goal"}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 style={{ margin: "0 0 18px", fontSize: 15 }}>Create Savings Goal</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Goal name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} className="form-input" />
            <input placeholder="Target amount ($)" type="number" value={form.targetAmount} onChange={e => setForm(p=>({...p,targetAmount:e.target.value}))} className="form-input" />
            <input placeholder="Icon (emoji)" value={form.icon} onChange={e => setForm(p=>({...p,icon:e.target.value}))} className="form-input" style={{ fontSize: 20 }} />
            <input type="date" value={form.targetDate} onChange={e => setForm(p=>({...p,targetDate:e.target.value}))} className="form-input" />
          </div>
          <button onClick={addGoal} className="action-btn" style={{ marginTop: 14, background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff" }}>
            Create Goal
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {savings.map((g, i) => (
          <div key={g._id} className="card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top right, ${g.color}15, transparent 70%)`, pointerEvents: "none" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 32 }}>{g.icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{g.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {g.daysLeft}d left · Need {fmt(g.requiredMonthly)}/mo
                  </p>
                </div>
              </div>
              <RadialProgress percent={g.progressPercent} color={g.color} size={56} strokeWidth={5}>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{g.progressPercent}%</span>
              </RadialProgress>
            </div>

            <div className="progress-bar" style={{ height: 6, marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${g.progressPercent}%`, background: g.color, borderRadius: 10, transition: "width 1s ease" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "#fff" }}>{fmt(g.currentAmount)}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}> / {fmt(g.targetAmount)}</span>
              </div>
              <button onClick={() => setDepositGoal(g)} className="action-btn" style={{
                background: `${g.color}22`, color: g.color, border: `1px solid ${g.color}44`,
                padding: "7px 14px", fontSize: 12,
              }}>+ Deposit</button>
            </div>
          </div>
        ))}
      </div>

      {/* Deposit Modal */}
      {depositGoal && (
        <div className="modal-overlay" onClick={() => setDepositGoal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontFamily: "'Syne',sans-serif" }}>
              {depositGoal.icon} Deposit to {depositGoal.name}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 24px" }}>
              Current: {fmt(depositGoal.currentAmount)} / {fmt(depositGoal.targetAmount)}
            </p>
            <input type="number" placeholder="Amount ($)" value={depositAmt}
              onChange={e => setDepositAmt(e.target.value)} className="form-input"
              style={{ marginBottom: 16 }} autoFocus />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDeposit} style={{
                flex: 1, padding: 13, background: "linear-gradient(135deg,#10b981,#059669)",
                border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>Confirm Deposit</button>
              <button onClick={() => setDepositGoal(null)} style={{
                padding: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ANALYTICS VIEW ────────────────────────────────────────────────────────
const AnalyticsView = ({ data }) => {
  const { overview } = data;
  const months = ["Jan","Feb","Mar","Apr","May","Jun"];
  const incomeData = [4200, 4200, 5200, 4800, 5200, 5200];
  const expenseData = [3100, 3400, 2900, 3200, 3180, 2800];
  const savingsRate = incomeData.map((inc, i) => Math.round(((inc - expenseData[i]) / inc) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Savings Rate Trend */}
      <div className="card">
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>6-Month Trend</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Income vs Expenses vs Savings Rate</p>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 140, padding: "0 8px" }}>
          {months.map((m, i) => {
            const maxVal = Math.max(...incomeData);
            const incH = (incomeData[i] / maxVal) * 120;
            const expH = (expenseData[i] / maxVal) * 120;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "#34d399", fontFamily: "'DM Mono',monospace" }}>{savingsRate[i]}%</span>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 120 }}>
                  <div style={{ width: 10, height: incH, background: "#6366f1", borderRadius: "3px 3px 0 0", opacity: 0.8, marginTop: `${120-incH}px` }} />
                  <div style={{ width: 10, height: expH, background: "#f59e0b", borderRadius: "3px 3px 0 0", opacity: 0.8, marginTop: `${120-expH}px` }} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{m}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          {[["#6366f1","Income"],["#f59e0b","Expenses"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[
          { label: "Avg Monthly Income", value: fmt(4933), delta: "+8.3%", positive: true },
          { label: "Avg Monthly Expense", value: fmt(3097), delta: "-3.1%", positive: true },
          { label: "Avg Savings Rate", value: "33%", delta: "+4.2%", positive: true },
          { label: "Projected Annual Savings", value: fmt(22000), delta: "on track", positive: true },
        ].map((m, i) => (
          <div key={i} className="card-sm">
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</p>
            <p style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{m.value}</p>
            <span style={{ fontSize: 12, color: m.positive ? "#34d399" : "#f87171", fontFamily: "'DM Mono',monospace" }}>{m.delta}</span>
          </div>
        ))}
      </div>

      {/* Category deep dive */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Category Breakdown</h3>
          console.log("Analytics overview:", overview);
          {(overview?.categoryBreakdown || []).map((c, i) => {
            const meta = getCatMeta(c._id);
            const pct = Math.round((c.total / overview.expense) * 100);
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{meta.emoji}</span> <span style={{ color: "rgba(255,255,255,0.7)" }}>{meta.label}</span>
                  </span>
                  <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.5)" }}>{fmt(c.total)} · {pct}%</span>
                </div>
                <div className="progress-bar">
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`, borderRadius: 10 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Savings Goal Projections</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {savings.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{g.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: g.daysLeft < 60 ? "#fbbf24" : "#34d399", fontFamily: "'DM Mono',monospace" }}>
                      {g.daysLeft}d left
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Need {fmt(g.requiredMonthly)}/month</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>{g.progressPercent}%</span>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 5, height: 5 }}>
                    <div style={{ height: "100%", width: `${g.progressPercent}%`, background: g.color, borderRadius: 10 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ADD TRANSACTION MODAL ─────────────────────────────────────────────────
const AddTransactionModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({ type: "expense", category: "food", amount: "", description: "", paymentMethod: "card", date: new Date().toISOString().split("T")[0] });

  const expenseCats = ["food","transport","housing","utilities","healthcare","entertainment","shopping","education","personal"];
  const incomeCats = ["salary","freelance","investment","bonus","rental"];
  const cats = form.type === "income" ? incomeCats : form.type === "savings" ? ["savings_deposit"] : expenseCats;

  const [saving, setSaving] = useState(false);
const submit = async () => {
  if (!form.amount || !form.description) return;
  setSaving(true);
  try {
    const data = await apiFetch('/transactions', {
      method: 'POST',
      body: { ...form, amount: parseFloat(form.amount) },
    });
    onAdd(data.transaction);   // ← passes the DB-saved transaction back up
  } catch (err) {
    alert(err.message);
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 6px", fontSize: 20, fontFamily: "'Syne',sans-serif" }}>Add Transaction</h3>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Record a new income, expense, or savings</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Type selector */}
          <div style={{ display: "flex", gap: 8 }}>
            {["expense","income","savings"].map(t => (
              <button key={t} onClick={() => setForm(p => ({ ...p, type: t, category: t==="income"?"salary":t==="savings"?"savings_deposit":"food" }))} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                background: form.type === t ? (t==="income"?"rgba(16,185,129,0.25)":t==="savings"?"rgba(99,102,241,0.25)":"rgba(239,68,68,0.25)") : "rgba(255,255,255,0.06)",
                color: form.type === t ? (t==="income"?"#34d399":t==="savings"?"#818cf8":"#f87171") : "rgba(255,255,255,0.4)",
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", textTransform: "capitalize",
              }}>{t}</button>
            ))}
          </div>

          <input type="number" placeholder="Amount ($)" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} className="form-input" />
          <input placeholder="Description" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} className="form-input" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))} className="form-input">
              {cats.map(c => <option key={c} value={c}>{getCatMeta(c).emoji} {getCatMeta(c).label}</option>)}
            </select>
            <select value={form.paymentMethod} onChange={e => setForm(p=>({...p,paymentMethod:e.target.value}))} className="form-input">
              {["card","cash","bank_transfer","mobile_money"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
            </select>
          </div>

          <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} className="form-input" />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={submit} style={{
            flex: 1, padding: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>Add Transaction</button>
          <button onClick={onClose} style={{
            padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};