import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import './App.css';

const SUPABASE_URL      = "https://qiwubzmlepzumcmhgwaw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eSmZwD-kyMoQ_2VMrb7wDg_vJABvtaM";
const supabaseClient    = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = [
  { value: 'General',  label: 'General',  icon: '🗂️', color: 'text-slate-300  border-slate-600  bg-slate-800/60'  },
  { value: 'Social',   label: 'Social',   icon: '💬', color: 'text-blue-300   border-blue-600/60  bg-blue-900/30'  },
  { value: 'Work',     label: 'Work',     icon: '💼', color: 'text-amber-300  border-amber-600/60 bg-amber-900/30' },
  { value: 'Banking',  label: 'Banking',  icon: '🏦', color: 'text-emerald-300 border-emerald-600/60 bg-emerald-900/30'},
  { value: 'Shopping', label: 'Shopping', icon: '🛍️', color: 'text-pink-300   border-pink-600/60  bg-pink-900/30'  },
  { value: 'Gaming',   label: 'Gaming',   icon: '🎮', color: 'text-purple-300 border-purple-600/60 bg-purple-900/30'},
  { value: 'Email',    label: 'Email',    icon: '📧', color: 'text-orange-300 border-orange-600/60 bg-orange-900/30'},
  { value: 'Other',    label: 'Other',    icon: '📌', color: 'text-red-300    border-red-600/60    bg-red-900/30'   },
];
const getCat = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[0];

// ── Favicon ──────────────────────────────────────────────────────────────────
function SiteFavicon({ url, name, size = 'md' }) {
  const [err, setErr] = useState(false);
  const sz = size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const domain = (() => { try { return new URL(url || '').hostname; } catch { return null; } })();
  if (!domain || err) {
    return (
      <div className={`${sz} rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0`}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }
  return (
    <img src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`} alt={name}
      className={`${sz} rounded-xl object-contain bg-white p-1 shrink-0 shadow-sm`}
      onError={() => setErr(true)} />
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Salin', onCopied }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true);
    if (onCopied) onCopied();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { try { await navigator.clipboard.writeText(''); } catch {} setCopied(false); }, 30000);
  };
  return (
    <button onClick={handleCopy}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-200 ${
        copied ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-slate-700'
      }`}>
      <span>{copied ? '✓' : '📋'}</span>
      <span>{copied ? 'Tersalin!' : label}</span>
    </button>
  );
}

// ── Toast Notification ────────────────────────────────────────────────────────
function Notification({ n }) {
  if (!n.show) return null;
  const cfg = {
    success: { bar: 'bg-emerald-500', bg: 'bg-emerald-950/95 border-emerald-500/20 text-emerald-300', icon: '✅' },
    error:   { bar: 'bg-red-500',     bg: 'bg-red-950/95   border-red-500/20   text-red-300',   icon: '🚨' },
    warning: { bar: 'bg-amber-500',   bg: 'bg-amber-950/95 border-amber-500/20 text-amber-300', icon: '⚠️' },
    info:    { bar: 'bg-cyan-500',    bg: 'bg-slate-950/95 border-slate-700/30 text-slate-300', icon: 'ℹ️' },
  }[n.type] || {};
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-start gap-3 p-4 rounded-2xl border shadow-2xl max-w-xs animate-fade-in ${cfg.bg}`}>
      <div className={`w-1 self-stretch rounded-full shrink-0 ${cfg.bar}`} />
      <span className="text-lg shrink-0">{cfg.icon}</span>
      <p className="text-xs font-medium leading-relaxed pt-0.5">{n.message}</p>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onCancel }) {
  if (!modal.show) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="glass rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">🗑️</span>
        </div>
        <h4 className="text-base font-bold text-center mb-2">Konfirmasi Tindakan</h4>
        <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">{modal.message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition">Batal</button>
          <button onClick={modal.onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-500/20">Ya, Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ user, isOfflineMode, onLogout }) {
  return (
    <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 pulse-dot" />
          </div>
          <div>
            <div className="font-black text-base tracking-widest text-gradient">KRYPTOVAULT</div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider">AES-256 · Zero-Knowledge</div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${isOfflineMode ? 'bg-amber-950/50 text-amber-400 border-amber-700/40' : 'bg-emerald-950/50 text-emerald-400 border-emerald-700/40'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'} pulse-dot`} />
            {isOfflineMode ? 'OFFLINE' : 'CLOUD'}
          </div>
          {user && (
            <>
              <span className="hidden sm:block text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 truncate max-w-[180px]">
                {user.email}
              </span>
              <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Kunci
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Auth Page ─────────────────────────────────────────────────────────────────
function AuthPage({ authMode, isOfflineMode, authMessage, authLoading, email, masterPassword, setEmail, setMasterPassword, onSubmit, onToggleMode, onSwitchOffline }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Judul */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 mb-4 shadow-xl shadow-emerald-500/10">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            {authMode === 'login' ? (
              <><span className="text-gradient">Buka</span> Brankas</>
            ) : (
              <><span className="text-gradient">Buat</span> Brankas Baru</>
            )}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            {isOfflineMode ? 'Mode offline aktif. Data tersimpan aman di browser Anda.' : 'Semua kata sandi dienkripsi AES-256 sebelum dikirim ke cloud.'}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-7 shadow-2xl border border-white/5">
          {authMessage.text && (
            <div className={`flex items-start gap-3 p-3.5 rounded-xl text-xs mb-5 border leading-relaxed animate-fade-in ${
              authMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>
              <span className="text-base shrink-0">{authMessage.type === 'success' ? '✅' : '❌'}</span>
              <span>{authMessage.text}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wider">EMAIL</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">📧</span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-slate-100 font-mono placeholder-slate-600"
                  placeholder="nama@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wider">MASTER PASSWORD</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔑</span>
                <input type="password" required value={masterPassword} onChange={e => setMasterPassword(e.target.value)}
                  className="input-field w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm font-mono placeholder-slate-600"
                  placeholder="••••••••" />
              </div>
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-950/30 border border-amber-700/20 rounded-lg">
                <span className="text-amber-400 text-xs shrink-0">⚠️</span>
                <p className="text-[10px] text-amber-400/80 leading-relaxed">Password ini adalah kunci enkripsi AES lokal. Tidak dapat dipulihkan jika lupa.</p>
              </div>
            </div>
            <button type="submit" disabled={authLoading}
              className={`btn-glow w-full py-3 font-black text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed tracking-wide ${
                isOfflineMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40'
              }`}>
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Memproses...
                </span>
              ) : authMode === 'login' ? '🔓  BUKA VAULT' : '🏗️  BUAT BRANKAS'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/5 text-center space-y-2">
            <button onClick={onToggleMode} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition hover:underline">
              {authMode === 'login' ? 'Belum punya brankas? Daftar sekarang →' : '← Sudah punya akun? Masuk di sini'}
            </button>
            {!isOfflineMode && (
              <div className="pt-2">
                <button onClick={onSwitchOffline} className="text-[10px] text-slate-500 hover:text-amber-400 font-mono transition">
                  💡 Masalah koneksi? Gunakan Mode Offline
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Form Tambah Password ──────────────────────────────────────────────────────
function AddPasswordForm({ onSubmit, siteName, setSiteName, siteUrl, setSiteUrl, usernameOrEmail, setUsernameOrEmail, sitePassword, setSitePassword, category, setCategory, useSessionKey, setUseSessionKey, customKey, setCustomKey }) {
  return (
    <div className="glass rounded-2xl border border-white/5 shadow-xl sticky top-20 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
          <span className="text-sm">➕</span>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">Simpan Sandi Baru</div>
          <div className="text-[10px] text-slate-500">Terenkripsi AES-256 sebelum disimpan</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-5 space-y-3.5">
        {/* Nama Layanan */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">Nama Layanan *</label>
          <input type="text" required placeholder="GitHub, Netflix, Tokopedia…" value={siteName} onChange={e => setSiteName(e.target.value)}
            className="input-field w-full px-3.5 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-100 placeholder-slate-600" />
        </div>

        {/* Kategori */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 tracking-widest uppercase">Kategori</label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[9px] font-bold transition-all ${
                  category === cat.value
                    ? `${cat.color} scale-105 shadow-lg`
                    : 'border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-500 bg-slate-900/40'
                }`}>
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">URL (opsional)</label>
          <input type="url" placeholder="https://github.com" value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
            className="input-field w-full px-3.5 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm font-mono text-slate-300 placeholder-slate-600" />
        </div>

        {/* Username */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 tracking-widest uppercase">Username / Email *</label>
          <input type="text" required placeholder="user@email.com" value={usernameOrEmail} onChange={e => setUsernameOrEmail(e.target.value)}
            className="input-field w-full px-3.5 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm font-mono text-slate-300 placeholder-slate-600" />
        </div>

        {/* Enkripsi */}
        <div className="bg-slate-900/40 border border-emerald-500/10 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-emerald-400 mb-1 tracking-widest uppercase">Password Layanan *</label>
            <input type="password" required placeholder="Kata sandi yang akan dienkripsi" value={sitePassword} onChange={e => setSitePassword(e.target.value)}
              className="input-field w-full px-3.5 py-2 bg-slate-950 border border-slate-700/50 rounded-xl text-sm font-mono text-emerald-300 placeholder-slate-600" />
          </div>
          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">🔑 Kunci AES</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={useSessionKey} onChange={e => setUseSessionKey(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-500 focus:ring-0" />
                <span className="text-[10px] text-slate-400">Kunci Sesi</span>
              </label>
            </div>
            {useSessionKey ? (
              <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/40 border border-emerald-500/20 rounded-lg">
                <span className="text-[11px] text-emerald-400 font-mono">✓ Kunci Sesi Aktif</span>
                <span className="text-[9px] text-slate-500 font-bold">AES-256</span>
              </div>
            ) : (
              <input type="password" required={!useSessionKey} placeholder="Masukkan kunci kustom…" value={customKey} onChange={e => setCustomKey(e.target.value)}
                className="input-field w-full px-3.5 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-sm font-mono text-amber-400 placeholder-slate-600" />
            )}
          </div>
        </div>

        <button type="submit"
          className="btn-glow w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 tracking-wide">
          🔒  Enkripsi &amp; Simpan
        </button>
      </form>
    </div>
  );
}

// ── Password Card ─────────────────────────────────────────────────────────────
function PasswordCard({ item, activeSessionKey, decryptedPasswords, tempMasterKeys, setTempMasterKeys, onDecrypt, onDelete, onCopied }) {
  const cat = getCat(item.category || 'General');
  const decrypted = decryptedPasswords[item.id];

  return (
    <div className="vault-card glass rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all duration-300 shadow-lg overflow-hidden animate-fade-in-up group">
      {/* Top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-transparent" />

      <div className="p-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <SiteFavicon url={item.site_url} name={item.site_name} />
            <div className="min-w-0">
              <h4 className="font-bold text-slate-100 text-sm truncate">{item.site_name}</h4>
              {item.site_url && (
                <a href={item.site_url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-slate-500 hover:text-cyan-400 font-mono truncate block transition-colors">
                  {item.site_url}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
            <button onClick={() => onDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-xs">
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Kolom kiri */}
          <div className="space-y-3">
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-slate-600 tracking-widest block uppercase mb-0.5">Username / Email</span>
                  <span className="text-xs font-mono text-slate-300 truncate block">{item.username_or_email}</span>
                </div>
                <CopyButton text={item.username_or_email} label="Salin" onCopied={() => onCopied('Username disalin!')} />
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-600 tracking-widest block uppercase mb-1">Ciphertext (Database)</span>
              <div className="text-[9px] font-mono text-slate-600 break-all line-clamp-2 select-all leading-relaxed">
                {item.encrypted_password}
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-emerald-600 font-semibold">Terenkripsi AES-256</span>
              </div>
            </div>
          </div>

          {/* Kolom kanan: dekripsi */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
            <span className="text-[9px] font-bold text-slate-600 tracking-widest block uppercase mb-2">Dekripsi Lokal</span>
            {decrypted ? (
              <div className="animate-fade-in">
                <div className="bg-emerald-950/60 border border-emerald-500/20 rounded-xl p-3 mb-2">
                  <span className="text-[9px] text-emerald-600 block mb-1 font-semibold uppercase">Password Asli</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-emerald-300 text-sm font-bold select-all break-all flex-1">{decrypted}</span>
                  </div>
                </div>
                <CopyButton text={decrypted} label="Salin Password" onCopied={() => onCopied(`Password ${item.site_name} disalin. Clipboard bersih 30 detik.`)} />
              </div>
            ) : (
              <div className="space-y-2">
                {activeSessionKey && (
                  <button onClick={() => onDecrypt(item.id, item.encrypted_password, activeSessionKey)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15">
                    🔓 Dekripsi Otomatis
                  </button>
                )}
                <div className="border-t border-white/5 pt-2">
                  <span className="text-[9px] text-slate-600 block mb-1.5 font-semibold">Kunci manual:</span>
                  <div className="flex gap-1.5">
                    <input type="password" placeholder="Master password…"
                      value={tempMasterKeys[item.id] || ''}
                      onChange={e => setTempMasterKeys(p => ({ ...p, [item.id]: e.target.value }))}
                      className="input-field flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700/50 rounded-lg text-xs font-mono text-amber-400 placeholder-slate-700" />
                    <button onClick={() => onDecrypt(item.id, item.encrypted_password, tempMasterKeys[item.id])}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all">
                      Uji
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineUsers,  setOfflineUsers]  = useState([]);
  const [user,             setUser]             = useState(null);
  const [email,            setEmail]            = useState('');
  const [masterPassword,   setMasterPassword]   = useState('');
  const [activeSessionKey, setActiveSessionKey] = useState('');
  const [authMode,         setAuthMode]         = useState('login');
  const [authLoading,      setAuthLoading]      = useState(false);
  const [authMessage,      setAuthMessage]      = useState({ type: '', text: '' });
  const [vault,             setVault]             = useState([]);
  const [vaultLoading,      setVaultLoading]      = useState(false);
  const [decryptedPasswords,setDecryptedPasswords]= useState({});
  const [tempMasterKeys,    setTempMasterKeys]    = useState({});
  const [siteName,        setSiteName]        = useState('');
  const [siteUrl,         setSiteUrl]         = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [sitePassword,    setSitePassword]    = useState('');
  const [category,        setCategory]        = useState('General');
  const [useSessionKey,   setUseSessionKey]   = useState(true);
  const [customKey,       setCustomKey]       = useState('');
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filterCategory,  setFilterCategory]  = useState('All');
  const [notif,   setNotif]   = useState({ show: false, type: 'info', message: '' });
  const [modal,   setModal]   = useState({ show: false, message: '', onConfirm: null });

  const showNotif = (message, type = 'info') => {
    setNotif({ show: true, type, message });
    setTimeout(() => setNotif(p => ({ ...p, show: false })), 4000);
  };
  const confirm = (message, fn) => setModal({ show: true, message, onConfirm: () => { fn(); setModal({ show: false, message: '', onConfirm: null }); } });
  const closeModal = () => setModal({ show: false, message: '', onConfirm: null });

  const saveLog = async (em, aktivitas, status) => {
    try { await supabaseClient.from('logs').insert([{ user_email: em, aktivitas, status }]); } catch {}
  };

  useEffect(() => {
    const u = localStorage.getItem('local_vault_users');    if (u) setOfflineUsers(JSON.parse(u));
    const v = localStorage.getItem('local_vault_passwords');
    if (v) { try { setVault(JSON.parse(v)); } catch { setVault([]); } }
    if (!isOfflineMode) {
      supabaseClient.auth.getSession().then(({ data: { session } }) => { if (session) setUser(session.user); });
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); if (!s) setActiveSessionKey(''); });
      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (user) { isOfflineMode ? fetchOfflineVault() : fetchCloudVault(); }
    else { setVault([]); setDecryptedPasswords({}); setTempMasterKeys({}); }
  }, [user, isOfflineMode]);

  const handleAuth = async (e) => {
    e.preventDefault(); setAuthLoading(true); setAuthMessage({ type: '', text: '' });
    const em = email.trim(), pw = masterPassword.trim();
    if (pw.length < 6) { setAuthMessage({ type: 'error', text: 'Master Password minimal 6 karakter!' }); setAuthLoading(false); return; }
    if (isOfflineMode) {
      setTimeout(() => {
        if (authMode === 'register') {
          if (offlineUsers.some(u => u.email === em)) { setAuthMessage({ type: 'error', text: 'Email sudah terdaftar!' }); }
          else { const u = [...offlineUsers, { id: 'local_' + Date.now(), email: em, password: pw }]; setOfflineUsers(u); localStorage.setItem('local_vault_users', JSON.stringify(u)); setAuthMessage({ type: 'success', text: 'Registrasi berhasil! Silakan masuk.' }); setAuthMode('login'); }
        } else {
          const f = offlineUsers.find(u => u.email === em && u.password === pw);
          if (f) { setUser({ id: f.id, email: em }); setActiveSessionKey(pw); showNotif('Selamat datang!', 'success'); }
          else { setAuthMessage({ type: 'error', text: 'Email atau password salah.' }); }
        }
        setAuthLoading(false);
      }, 600); return;
    }
    try {
      if (authMode === 'register') {
        const { data, error } = await supabaseClient.auth.signUp({ email: em, password: pw });
        if (error) throw error;
        if (data?.user?.identities?.length === 0) { setAuthMessage({ type: 'error', text: 'Email sudah terdaftar!' }); }
        else { setAuthMessage({ type: 'success', text: 'Registrasi sukses! Silakan masuk.' }); setAuthMode('login'); await saveLog(em, 'Registrasi Akun', 'SUKSES'); }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
        setUser(data.user); setActiveSessionKey(pw); showNotif('Selamat datang kembali!', 'success');
        await saveLog(em, 'Login ke Aplikasi', 'SUKSES');
      }
    } catch (err) {
      let msg = err.message;
      if (msg.includes('Failed to fetch')) msg = 'Gagal menghubungi server.';
      else if (msg.includes('Invalid login')) msg = 'Email atau password keliru.';
      setAuthMessage({ type: 'error', text: msg });
      await saveLog(em, 'Gagal Login', 'GAGAL');
    } finally { setAuthLoading(false); }
  };

  const handleLogout = () => confirm('Yakin ingin mengunci brankas?', async () => {
    await saveLog(user?.email ?? '-', 'Logout', 'SUKSES');
    await supabaseClient.auth.signOut();
    setUser(null); setEmail(''); setMasterPassword(''); setActiveSessionKey('');
    showNotif('Brankas terkunci.', 'info');
  });

  const fetchCloudVault = async () => {
    setVaultLoading(true);
    try { const { data, error } = await supabaseClient.from('passwords').select('*').order('created_at', { ascending: false }); if (error) throw error; setVault(data || []); }
    catch (err) { console.error(err); } finally { setVaultLoading(false); }
  };
  const fetchOfflineVault = () => {
    setVaultLoading(true);
    const all = JSON.parse(localStorage.getItem('local_vault_passwords') || '[]');
    setVault(all.filter(p => p.user_id === user.id)); setVaultLoading(false);
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    const key = useSessionKey ? activeSessionKey : customKey;
    if (!siteName || !usernameOrEmail || !sitePassword || !key) { showNotif('Lengkapi semua kolom!', 'warning'); return; }
    const enc = CryptoJS.AES.encrypt(sitePassword, key).toString();
    try {
      if (isOfflineMode) {
        const all = JSON.parse(localStorage.getItem('local_vault_passwords') || '[]');
        localStorage.setItem('local_vault_passwords', JSON.stringify([{ id: 'p_' + Date.now(), user_id: user.id, site_name: siteName, site_url: siteUrl || null, username_or_email: usernameOrEmail, encrypted_password: enc, category, created_at: new Date().toISOString() }, ...all]));
        showNotif('Tersimpan lokal!', 'success'); fetchOfflineVault();
      } else {
        const { error } = await supabaseClient.from('passwords').insert([{ user_id: user.id, site_name: siteName, site_url: siteUrl || null, username_or_email: usernameOrEmail, encrypted_password: enc, category }]);
        if (error) throw error;
        showNotif('Tersimpan di cloud!', 'success');
        await saveLog(user.email, `Enkripsi & Simpan: ${siteName}`, 'SUKSES');
        fetchCloudVault();
      }
      setSiteName(''); setSiteUrl(''); setUsernameOrEmail(''); setSitePassword(''); setCustomKey(''); setCategory('General');
    } catch (err) { showNotif('Gagal: ' + err.message, 'error'); }
  };

  const handleDecrypt = (id, enc, key) => {
    if (!key) { showNotif('Masukkan kunci!', 'warning'); return; }
    try {
      const plain = CryptoJS.AES.decrypt(enc, key).toString(CryptoJS.enc.Utf8);
      if (!plain) throw new Error();
      setDecryptedPasswords(p => ({ ...p, [id]: plain })); showNotif('Dekripsi berhasil!', 'success');
    } catch { showNotif('Kunci salah atau tidak cocok.', 'error'); }
  };

  const handleDelete = (id) => confirm('Hapus kata sandi ini secara permanen?', async () => {
    try {
      if (isOfflineMode) { localStorage.setItem('local_vault_passwords', JSON.stringify(JSON.parse(localStorage.getItem('local_vault_passwords') || '[]').filter(p => p.id !== id))); showNotif('Dihapus.', 'info'); fetchOfflineVault(); }
      else { const { error } = await supabaseClient.from('passwords').delete().eq('id', id); if (error) throw error; showNotif('Dihapus dari cloud.', 'info'); fetchCloudVault(); }
    } catch (err) { showNotif('Gagal: ' + err.message, 'error'); }
  });

  const handleCopied = async (msg) => { showNotif(msg, 'info'); await saveLog(user?.email ?? '-', 'Menyalin ke Clipboard', 'SUKSES'); };

  const filteredVault = vault.filter(item => {
    const s = searchTerm.toLowerCase();
    return (item.site_name?.toLowerCase().includes(s) || item.username_or_email?.toLowerCase().includes(s))
      && (filterCategory === 'All' || item.category === filterCategory);
  });

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(16,185,129,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.05) 0%, transparent 60%), #020817' }}>
      <Notification n={notif} />
      <ConfirmModal modal={modal} onCancel={closeModal} />
      <Header user={user} isOfflineMode={isOfflineMode} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-16">
        {isOfflineMode && (
          <div className="mb-6 flex justify-center">
            <button onClick={() => { setIsOfflineMode(false); setUser(null); setAuthMessage({ type: '', text: '' }); showNotif('Beralih ke Cloud.', 'info'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all">
              ☁️ Hubungkan ke Cloud Supabase
            </button>
          </div>
        )}

        {!user ? (
          <AuthPage authMode={authMode} isOfflineMode={isOfflineMode} authMessage={authMessage}
            authLoading={authLoading} email={email} masterPassword={masterPassword}
            setEmail={setEmail} setMasterPassword={setMasterPassword} onSubmit={handleAuth}
            onToggleMode={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthMessage({ type: '', text: '' }); }}
            onSwitchOffline={() => { setIsOfflineMode(true); setUser(null); setAuthMessage({ type: '', text: '' }); showNotif('Mode Offline aktif.', 'info'); }} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel kiri */}
            <div className="lg:col-span-1">
              <AddPasswordForm onSubmit={handleAddPassword}
                siteName={siteName} setSiteName={setSiteName} siteUrl={siteUrl} setSiteUrl={setSiteUrl}
                usernameOrEmail={usernameOrEmail} setUsernameOrEmail={setUsernameOrEmail}
                sitePassword={sitePassword} setSitePassword={setSitePassword}
                category={category} setCategory={setCategory}
                useSessionKey={useSessionKey} setUseSessionKey={setUseSessionKey}
                customKey={customKey} setCustomKey={setCustomKey} />
            </div>

            {/* Panel kanan */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats bar */}
              <div className="glass rounded-2xl border border-white/5 px-5 py-3.5 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">🗄️</div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">Vault {isOfflineMode ? 'Lokal' : 'Cloud'}</div>
                    <div className="text-[10px] text-slate-500">{filteredVault.length} dari {vault.length} entri</div>
                  </div>
                </div>
                <button onClick={isOfflineMode ? fetchOfflineVault : fetchCloudVault}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition">
                  🔄 Sinkron
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input type="text" placeholder="Cari nama layanan, username, atau email…"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="input-field w-full pl-10 pr-4 py-3 glass border border-white/5 rounded-2xl text-sm text-slate-200 placeholder-slate-600" />
              </div>

              {/* Filter kategori */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterCategory('All')}
                  className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${filterCategory === 'All' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-transparent shadow-lg shadow-emerald-500/20' : 'glass text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-300'}`}>
                  🗃️ Semua
                </button>
                {CATEGORIES.map(cat => (
                  <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
                    className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition-all ${filterCategory === cat.value ? `${cat.color} shadow-md` : 'glass text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-400'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* Vault list */}
              {vaultLoading ? (
                <div className="text-center py-16 glass rounded-2xl border border-white/5">
                  <div className="inline-flex items-center gap-3 text-slate-400">
                    <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="text-sm font-mono">Memuat data vault…</span>
                  </div>
                </div>
              ) : filteredVault.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl border border-white/5 animate-fade-in">
                  <span className="text-5xl block mb-3">{searchTerm || filterCategory !== 'All' ? '🔍' : '📭'}</span>
                  <p className="text-sm text-slate-400 font-medium">
                    {searchTerm || filterCategory !== 'All' ? 'Tidak ada hasil yang cocok.' : 'Brankas masih kosong.'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {searchTerm || filterCategory !== 'All' ? 'Coba kata kunci atau filter lain.' : 'Tambahkan sandi pertama Anda di panel kiri.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVault.map(item => (
                    <PasswordCard key={item.id} item={item}
                      activeSessionKey={activeSessionKey} decryptedPasswords={decryptedPasswords}
                      tempMasterKeys={tempMasterKeys} setTempMasterKeys={setTempMasterKeys}
                      onDecrypt={handleDecrypt} onDelete={handleDelete} onCopied={handleCopied} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
