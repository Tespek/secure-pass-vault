import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const SUPABASE_URL = "https://qiwubzmlepzumcmhgwaw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_eSmZwD-kyMoQ_2VMrb7wDg_vJABvtaM";

// Inisialisasi Supabase client langsung (tidak lagi pakai CDN)
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // --- STATE SYSTEM ---
  const [supabase] = useState(supabaseClient);
  const [isClientReady] = useState(true);
  const [cryptoJS] = useState(CryptoJS);
  const [libsLoading] = useState(false);
  
  // --- MODE OPERASI: CLOUD VS DEMO OFFLINE ---
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineUsers, setOfflineUsers] = useState([]); // Simulasi tabel user lokal

  // --- STATE AUTENTIKASI (BERBASIS EMAIL) ---
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState(''); // Kembali menggunakan Email
  const [masterPassword, setMasterPassword] = useState(''); // Master Password sekaligus kunci AES
  const [activeSessionKey, setActiveSessionKey] = useState(''); // Menyimpan Master Password aktif untuk dekripsi instan
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' });

  // --- STATE DASHBOARD & PASSWORD MANAGER ---
  const [vault, setVault] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [sitePassword, setSitePassword] = useState('');
  const [useSessionKeyForAdd, setUseSessionKeyForAdd] = useState(true); // Default menggunakan kunci sesi aktif
  const [customMasterPassword, setCustomMasterPassword] = useState(''); // Jika tidak menggunakan kunci sesi aktif
  
  // Pelacakan status dekripsi lokal di memori klien
  const [decryptedPasswords, setDecryptedPasswords] = useState({}); 
  const [tempMasterKeys, setTempMasterKeys] = useState({}); 

  // --- NOTIFIKASI KUSTOM & DIALOG MODAL (PENGGANTI ALERT & CONFIRM) ---
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, message: '', onConfirm: null });

  // Fungsi Pembantu Notifikasi
  const showAppNotification = (message, type = 'info') => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Fungsi Pembantu Konfirmasi Modal
  const requestConfirmation = (message, onConfirmAction) => {
    setConfirmModal({
      show: true,
      message,
      onConfirm: () => {
        onConfirmAction();
        setConfirmModal({ show: false, message: '', onConfirm: null });
      }
    });
  };

  // --- INISIALISASI ---
  useEffect(() => {
    // Ambil data offline dari LocalStorage
    const savedOfflineUsers = localStorage.getItem('local_vault_users');
    if (savedOfflineUsers) {
      setOfflineUsers(JSON.parse(savedOfflineUsers));
    }
    const savedOfflineVault = localStorage.getItem('local_vault_passwords');
    if (savedOfflineVault) {
      try { setVault(JSON.parse(savedOfflineVault)); } catch (e) { setVault([]); }
    }

    // Cek sesi Supabase yang tersimpan
    if (!isOfflineMode) {
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) setUser(session.user);
      });
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (!session) setActiveSessionKey('');
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  // Muat data sandi setiap kali user berganti
  useEffect(() => {
    if (user) {
      if (isOfflineMode) {
        fetchOfflineVault();
      } else if (isClientReady) {
        fetchCloudVault();
      }
    } else {
      setVault([]);
      setDecryptedPasswords({});
      setTempMasterKeys({});
    }
  }, [user, isClientReady, isOfflineMode]);

  // --- LOGIKA PENANGANAN AUTENTIKASI SINKRON ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage({ type: '', text: '' });

    const cleanEmail = email.trim();
    const cleanPassword = masterPassword.trim();

    if (cleanPassword.length < 6) {
      setAuthMessage({ type: 'error', text: 'Keamanan Lemah: Master Password minimal harus berisi 6 karakter!' });
      setAuthLoading(false);
      return;
    }

    // --- JALUR MODE DEMO OFFLINE ---
    if (isOfflineMode) {
      setTimeout(() => {
        if (authMode === 'register') {
          const userExists = offlineUsers.some(u => u.email === cleanEmail);
          if (userExists) {
            setAuthMessage({ type: 'error', text: 'Email tersebut sudah terdaftar di sistem lokal!' });
          } else {
            const newUser = { id: 'local_' + Date.now(), email: cleanEmail, password: cleanPassword };
            const updatedUsers = [...offlineUsers, newUser];
            setOfflineUsers(updatedUsers);
            localStorage.setItem('local_vault_users', JSON.stringify(updatedUsers));
            setAuthMessage({ type: 'success', text: 'Registrasi Lokal Sukses! Silakan masuk menggunakan Email tersebut.' });
            setAuthMode('login');
          }
        } else {
          const foundUser = offlineUsers.find(u => u.email === cleanEmail && u.password === cleanPassword);
          if (foundUser) {
            setUser({ id: foundUser.id, email: cleanEmail });
            setActiveSessionKey(cleanPassword); // Daftarkan master key aktif untuk enkripsi/dekripsi otomatis
            showAppNotification(`Selamat datang kembali di KryptoVault!`, 'success');
          } else {
            setAuthMessage({ type: 'error', text: 'Login gagal! Email atau Master Password salah.' });
          }
        }
        setAuthLoading(false);
      }, 600);
      return;
    }

    // --- JALUR MODE CLOUD SUPABASE ---
    if (!isClientReady) {
      setAuthMessage({ type: 'error', text: 'Koneksi Supabase belum siap. Hubungkan database Anda!' });
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });
        
        if (error) throw error;

        if (data?.user && data.user.identities?.length === 0) {
          setAuthMessage({ type: 'error', text: 'Email ini sudah terdaftar! Gunakan email lain atau silakan langsung login.' });
        } else {
          setAuthMessage({ 
            type: 'success', 
            text: 'Registrasi Sukses! Akun Anda kini aktif. Silakan beralih ke menu Masuk di bawah.' 
          });
          setAuthMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;
        setUser(data.user);
        setActiveSessionKey(cleanPassword); // Daftarkan master key aktif untuk enkripsi/dekripsi otomatis
        showAppNotification(`Koneksi cloud sukses! Selamat datang kembali.`, 'success');
      }
    } catch (err) {
      let friendlyError = err.message;
      if (err.message.includes('Failed to fetch')) {
        friendlyError = 'Gagal menghubungi server Supabase. Pastikan koneksi internet aktif, atau gunakan "Mode Simulasi Lokal" di bawah.';
      } else if (err.message.includes('Invalid login credentials')) {
        friendlyError = 'Gagal masuk: Email atau Master Password yang Anda masukkan keliru.';
      }
      setAuthMessage({ type: 'error', text: friendlyError });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    requestConfirmation('Apakah Anda yakin ingin mengunci brankas KryptoVault?', async () => {
      if (!isOfflineMode && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setEmail('');
      setMasterPassword('');
      setActiveSessionKey('');
      setDecryptedPasswords({});
      setTempMasterKeys({});
      showAppNotification('Brankas KryptoVault berhasil dikunci secara aman.', 'info');
    });
  };

  // --- LOGIKA DATABASE & KRIPTOGRAFI AES ---
  const fetchCloudVault = async () => {
    setVaultLoading(true);
    try {
      const { data, error } = await supabase
        .from('passwords')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVault(data || []);
    } catch (err) {
      console.error("Gagal mengambil data vault cloud:", err.message);
    } finally {
      setVaultLoading(false);
    }
  };

  const fetchOfflineVault = () => {
    setVaultLoading(true);
    const saved = localStorage.getItem('local_vault_passwords') || '[]';
    const allPasswords = JSON.parse(saved);
    const userPasswords = allPasswords.filter(p => p.user_id === user.id);
    setVault(userPasswords);
    setVaultLoading(false);
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    
    // Tentukan kunci enkripsi yang akan digunakan
    const targetKey = useSessionKeyForAdd ? activeSessionKey : customMasterPassword;

    if (!siteName || !usernameOrEmail || !sitePassword || !targetKey) {
      showAppNotification("Harap lengkapi semua kolom wajib (*), termasuk Kunci Enkripsi!", "warning");
      return;
    }

    if (!cryptoJS) {
      showAppNotification("Modul Kriptografi sedang dimuat, mohon tunggu sebentar.", "warning");
      return;
    }

    try {
      // 1. Eksekusi Enkripsi AES-256 di sisi klien (Kunci Rahasia tidak pernah dikirim ke database)
      const encrypted = cryptoJS.AES.encrypt(sitePassword, targetKey).toString();

      if (isOfflineMode) {
        // Simpan lokal di LocalStorage
        const saved = localStorage.getItem('local_vault_passwords') || '[]';
        const allPasswords = JSON.parse(saved);
        const newRecord = {
          id: 'pass_' + Date.now(),
          user_id: user.id,
          site_name: siteName,
          site_url: siteUrl || null,
          username_or_email: usernameOrEmail,
          encrypted_password: encrypted,
          created_at: new Date().toISOString()
        };
        const updated = [newRecord, ...allPasswords];
        localStorage.setItem('local_vault_passwords', JSON.stringify(updated));
        
        // Reset input form
        setSiteName('');
        setSiteUrl('');
        setUsernameOrEmail('');
        setSitePassword('');
        setCustomMasterPassword('');
        showAppNotification("Kata sandi berhasil dienkripsi & disimpan di database lokal simulasi!", "success");
        fetchOfflineVault();
      } else {
        // Simpan secara cloud di Supabase
        const { error } = await supabase
          .from('passwords')
          .insert([
            {
              user_id: user.id,
              site_name: siteName,
              site_url: siteUrl || null,
              username_or_email: usernameOrEmail,
              encrypted_password: encrypted
            }
          ]);

        if (error) throw error;

        setSiteName('');
        setSiteUrl('');
        setUsernameOrEmail('');
        setSitePassword('');
        setCustomMasterPassword('');
        showAppNotification("Kata sandi berhasil dienkripsi & disimpan di cloud Supabase!", "success");
        fetchCloudVault();
      }
    } catch (err) {
      showAppNotification("Gagal mengamankan data: " + err.message, "error");
    }
  };

  const handleDecryptPassword = (id, encryptedText, inputMasterKey) => {
    if (!inputMasterKey) {
      showAppNotification("Masukkan kunci enkripsi untuk melakukan dekripsi!", "warning");
      return;
    }

    if (!cryptoJS) return;

    try {
      // Dekripsi data menggunakan CryptoJS AES di sisi klien
      const bytes = cryptoJS.AES.decrypt(encryptedText, inputMasterKey);
      const originalText = bytes.toString(cryptoJS.enc.Utf8);

      if (!originalText) {
        throw new Error("Kunci salah");
      }

      setDecryptedPasswords(prev => ({
        ...prev,
        [id]: originalText
      }));
      showAppNotification("Dekripsi AES-256 berhasil! Password polos ditampilkan.", "success");
    } catch (err) {
      showAppNotification("🚨 Dekripsi Gagal! Master Password salah atau tidak cocok.", "error");
    }
  };

  const handleDeletePassword = (id) => {
    requestConfirmation("Apakah Anda yakin ingin menghapus data kata sandi ini secara permanen dari database?", async () => {
      try {
        if (isOfflineMode) {
          const saved = localStorage.getItem('local_vault_passwords') || '[]';
          const allPasswords = JSON.parse(saved);
          const filtered = allPasswords.filter(p => p.id !== id);
          localStorage.setItem('local_vault_passwords', JSON.stringify(filtered));
          showAppNotification("Kata sandi dihapus dari database lokal simulasi.", "info");
          fetchOfflineVault();
        } else {
          const { error } = await supabase
            .from('passwords')
            .delete()
            .eq('id', id);

          if (error) throw error;
          showAppNotification("Kata sandi dihapus secara permanen dari database cloud Supabase.", "info");
          fetchCloudVault();
        }
      } catch (err) {
        showAppNotification("Gagal menghapus: " + err.message, "error");
      }
    });
  };

  if (libsLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-sm font-mono tracking-wider">Memuat sistem keamanan kriptografi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-12">
      
      {/* --- NOTIFIKASI APP ELEGAN --- */}
      {notification.show && (
        <div className={`fixed top-5 right-5 z-[9999] max-w-sm p-4 rounded-xl shadow-2xl border transition-all duration-300 animate-slide-in flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' :
          notification.type === 'error' ? 'bg-red-950/90 text-red-400 border-red-500/30' :
          notification.type === 'warning' ? 'bg-amber-950/90 text-amber-400 border-amber-500/30' :
          'bg-slate-950/90 text-slate-350 border-slate-700/30'
        }`}>
          <span className="text-xl">
            {notification.type === 'success' ? '✅' :
             notification.type === 'error' ? '🚨' :
             notification.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <p className="text-xs font-semibold leading-relaxed">{notification.message}</p>
        </div>
      )}

      {/* --- CONFIRM DIALOG OVERLAY --- */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-scale-in">
            <div className="text-3xl text-center mb-3">❓</div>
            <h4 className="text-base font-bold text-center mb-2 text-slate-100">Konfirmasi Tindakan</h4>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal({ show: false, message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-750 transition"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-bold rounded-lg transition"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER UTAMA */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-emerald-400">KRYPTOVAULT</h1>
              <p className="text-xs text-slate-400 font-mono">React + Supabase AES-256 Zero-Knowledge Vault</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* INDIKATOR STATUS MODE */}
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${isOfflineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span className="text-xs font-semibold text-slate-300 bg-slate-850 px-2 py-1 rounded border border-slate-800">
                Mode: {isOfflineMode ? 'OFFLINE SIMULATOR' : 'CLOUD ACTIVE'}
              </span>
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-350 hidden sm:inline-block font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  ID: <span className="text-emerald-400 font-bold">{user.email}</span>
                </span>
                <button 
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500 hover:text-white transition-all duration-200"
                >
                  Kunci Vault
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* PANEL EDIT KREDENSIAL SUPABASE (Hanya muncul jika admin ingin mengganti secara manual) */}
        {isOfflineMode && (
          <div className="mb-6 text-center">
            <button
              onClick={() => {
                setIsOfflineMode(false);
                setUser(null);
                setAuthMessage({ type: '', text: '' });
                showAppNotification('Beralih kembali ke Database Cloud Supabase.', 'info');
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md transition-all"
            >
              Hubungkan Kembali Database Cloud Supabase
            </button>
          </div>
        )}

        {/* HALAMAN UTAMA JIKA BELUM LOGIN */}
        {!user ? (
          <div className="max-w-md mx-auto mt-6">
            <div className="bg-slate-950/60 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">
                {authMode === 'login' ? 'Buka Brankas Vault' : 'Buat Brankas Baru'}
              </h2>
              <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
                {isOfflineMode 
                  ? 'Menjalankan simulator lokal. Data disimpan aman di LocalStorage browser.'
                  : 'Seluruh data sandi dilindungi enkripsi AES militer sisi-klien di cloud Supabase.'}
              </p>

              {authMessage.text && (
                <div className={`p-4 rounded-xl text-xs mb-5 border leading-relaxed ${
                  authMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {authMessage.text}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">ALAMAT EMAIL</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                    placeholder="Contoh: faiz@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">MASTER PASSWORD</label>
                  <input 
                    type="password" 
                    required 
                    value={masterPassword} 
                    onChange={(e) => setMasterPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                    placeholder="••••••••"
                  />
                  <p className="text-[10px] text-amber-500/80 mt-1 leading-relaxed">
                    ⚠️ **Kunci Kriptografi:** Password ini digunakan lokal untuk enkripsi data. Jika lupa, data tidak akan bisa didekripsi kembali.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className={`w-full py-3 font-bold rounded-xl disabled:opacity-50 transition-all duration-200 shadow-lg ${
                    isOfflineMode 
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {authLoading ? 'Membuka...' : authMode === 'login' ? 'BUKA VAULT' : 'BUAT BRANKAS BARU'}
                </button>
              </form>

              <div className="mt-6 text-center border-t border-slate-900 pt-6">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className={`text-xs hover:underline font-semibold ${isOfflineMode ? 'text-amber-400' : 'text-emerald-400'}`}
                >
                  {authMode === 'login' ? 'Belum punya brankas? Buat di sini' : 'Sudah punya brankas? Masuk di sini'}
                </button>
              </div>

              {/* Tombol Bypass ke mode offline jika koneksi internet terganggu */}
              {!isOfflineMode && (
                <div className="mt-4 text-center border-t border-slate-900/60 pt-4">
                  <button
                    onClick={() => {
                      setIsOfflineMode(true);
                      setUser(null);
                      setAuthMessage({ type: '', text: '' });
                      showAppNotification('Simulator lokal offline diaktifkan.', 'info');
                    }}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 font-mono transition"
                  >
                    💡 Mengalami kendala koneksi? Klik untuk beralih ke Mode Offline
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DASHBOARD VAULT JIKA SUDAH LOGIN */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* PANEL KIRI: FORM ENKRIPSI & SIMPAN PASSWORD BARU */}
            <div className="lg:col-span-1">
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 shadow-xl sticky top-24">
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Amankan Sandi Baru
                </h3>

                <form onSubmit={handleAddPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">NAMA LAYANAN / APLIKASI *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: GitHub, Netflix, dll" 
                      value={siteName} 
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">URL LAYANAN (OPSIONAL)</label>
                    <input 
                      type="url" 
                      placeholder="https://github.com" 
                      value={siteUrl} 
                      onChange={(e) => setSiteUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">USERNAME ATAU EMAIL *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="user@email.com" 
                      value={usernameOrEmail} 
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-400 mb-1">PASSWORD LAYANAN *</label>
                      <input 
                        type="password" 
                        required
                        placeholder="Kata sandi yang mau diamankan" 
                        value={sitePassword} 
                        onChange={(e) => setSitePassword(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    
                    <div className="border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-amber-400">🔑 KUNCI ENKRIPSI AES</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            id="useSessionKey"
                            checked={useSessionKeyForAdd}
                            onChange={(e) => setUseSessionKeyForAdd(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <label htmlFor="useSessionKey" className="text-[10px] text-slate-350 cursor-pointer select-none">Gunakan Kunci Sesi</label>
                        </div>
                      </div>

                      {useSessionKeyForAdd ? (
                        <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-850 rounded-lg text-[11px] text-emerald-400/90 font-mono flex items-center justify-between">
                          <span>✓ Kunci Sesi Utama Aktif</span>
                          <span className="text-slate-550">AES-256</span>
                        </div>
                      ) : (
                        <input 
                          type="password" 
                          required={!useSessionKeyForAdd}
                          placeholder="Masukkan Kunci Kustom AES" 
                          value={customMasterPassword} 
                          onChange={(e) => setCustomMasterPassword(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-amber-400"
                        />
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Enkripsi & Simpan
                  </button>
                </form>
              </div>
            </div>

            {/* PANEL KANAN: DAFTAR PASSWORD TERENKRIPSI */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center bg-slate-950/20 px-4 py-3 rounded-xl border border-slate-800">
                <h3 className="font-bold text-slate-300 flex items-center gap-2">
                  <span>📁</span> Vault Terenkripsi {isOfflineMode ? 'Lokal' : 'Cloud'} ({vault.length})
                </h3>
                <button 
                  onClick={isOfflineMode ? fetchOfflineVault : fetchCloudVault}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 rounded-lg flex items-center gap-1.5 transition"
                >
                  🔄 Sinkron
                </button>
              </div>

              {vaultLoading ? (
                <div className="text-center py-12 bg-slate-950/20 rounded-2xl border border-slate-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p className="text-slate-400 text-sm font-mono">Mengambil data...</p>
                </div>
              ) : vault.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-slate-800 text-slate-400">
                  <span className="text-4xl block mb-3">📁</span>
                  <p className="text-sm">Brankas sandi Anda masih kosong. Silakan tambahkan sandi baru.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vault.map((item) => (
                    <div key={item.id} className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition shadow-md animate-fade-in">
                      <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-850 pb-3 mb-4">
                        <div>
                          <h4 className="font-extrabold text-emerald-400 text-base flex items-center gap-2">
                            <span>💻</span> {item.site_name}
                          </h4>
                          {item.site_url && (
                            <a href={item.site_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:underline font-mono">
                              {item.site_url}
                            </a>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeletePassword(item.id)}
                          className="px-2.5 py-1 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition"
                        >
                          Hapus
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Detail Kredensial */}
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-xs text-slate-500 font-semibold block">USERNAME / EMAIL</span>
                            <span className="font-mono text-slate-300">{item.username_or_email}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 font-semibold block">STATUS CIPHERTEXT (DI DATABASE)</span>
                            <div className="text-xs bg-slate-900 border border-slate-850 px-3 py-2 rounded-lg text-slate-400 break-all font-mono mt-1 select-all" title="Klik 3 kali untuk menyalin data mentah database Anda">
                              {item.encrypted_password}
                            </div>
                            <span className="text-[10px] text-emerald-500/80 mt-1 block">✓ Terenkripsi Aman Secara Militer</span>
                          </div>
                        </div>

                        {/* Kontrol Dekripsi AES */}
                        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-xs text-slate-500 font-semibold block mb-2">DEKRIPSI DEKKTOP (CLIENT-SIDE)</span>
                            {decryptedPasswords[item.id] ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                                <span className="text-xs text-slate-400 block mb-1">PASSWORD ASLI</span>
                                <span className="font-mono text-emerald-350 text-base font-bold select-all">{decryptedPasswords[item.id]}</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Opsi Dekripsi Instan via Kunci Sesi Aktif */}
                                {activeSessionKey && (
                                  <button
                                    onClick={() => handleDecryptPassword(item.id, item.encrypted_password, activeSessionKey)}
                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                                  >
                                    🔓 Dekripsi Sesi Instan
                                  </button>
                                )}
                                
                                <div className="border-t border-slate-800/80 my-2 pt-2">
                                  <span className="text-[10px] text-slate-400 block mb-1.5">Atau gunakan kunci manual:</span>
                                  <div className="flex gap-2">
                                    <input 
                                      type="password"
                                      placeholder="Kunci Master Alternatif"
                                      value={tempMasterKeys[item.id] || ''}
                                      onChange={(e) => setTempMasterKeys(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                      onClick={() => handleDecryptPassword(item.id, item.encrypted_password, tempMasterKeys[item.id])}
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                                    >
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