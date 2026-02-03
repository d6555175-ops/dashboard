
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  PlusCircle, 
  History, 
  Coins, 
  Users, 
  RefreshCw,
  LayoutDashboard,
  Zap,
  UserPlus,
  MinusCircle,
  ArrowDownCircle,
  TrendingDown,
  Globe,
  LogOut,
  LogIn
} from 'lucide-react';
import { MiningLog, CryptoPrices, StatusType, Investor, TeamWithdrawal } from './types';
import { fetchBtcPrices } from './services/api';
import { auth, db, googleProvider } from './services/firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc,
  orderBy 
} from 'firebase/firestore';

const PriceCard = ({ title, value, currency, symbol, isLoading, color = "text-emerald-400", isCrypto = false }: { 
  title: string; 
  value: number; 
  currency: string; 
  symbol: string;
  isLoading?: boolean;
  color?: string;
  isCrypto?: boolean;
}) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
       {isCrypto ? <Coins size={40} /> : <TrendingUp size={40} />}
    </div>
    <p className="text-zinc-400 text-xs font-medium mb-1 uppercase tracking-wider">{title}</p>
    <div className="flex items-baseline gap-2">
      {isLoading ? (
        <div className="h-8 w-32 bg-zinc-800 animate-pulse rounded"></div>
      ) : (
        <h3 className={`text-2xl font-bold mono ${color}`}>
          {symbol} {value.toLocaleString('pt-BR', { minimumFractionDigits: isCrypto ? 8 : 2, maximumFractionDigits: isCrypto ? 8 : 2 })}
        </h3>
      )}
      <span className="text-zinc-500 text-[10px] font-mono">{currency}</span>
    </div>
  </div>
);

const App: React.FC = () => {
  // Estado de Autenticação
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Estados de Dados (Vindo do Firestore)
  const [logs, setLogs] = useState<MiningLog[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [withdrawals, setWithdrawals] = useState<TeamWithdrawal[]>([]);
  
  // Estados de UI
  const [prices, setPrices] = useState<CryptoPrices>({ usd: 0, brl: 0, lastUpdated: 0 });
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [activeTab, setActiveTab] = useState<'mining' | 'team'>('mining');

  // Formulários
  const [miningForm, setMiningForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '' });
  const [investorForm, setInvestorForm] = useState({ name: '', contribution: '' });
  const [withdrawalForm, setWithdrawalForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', description: '' });

  const updatePrices = useCallback(async () => {
    const newPrices = await fetchBtcPrices();
    if (newPrices.usd > 0) {
      setPrices(newPrices);
      setIsLoadingPrices(false);
    }
  }, []);

  // Monitorar Autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Carregar Dados do Firestore em Tempo Real
  useEffect(() => {
    if (!user) return;

    // Listeners do Firestore
    const qLogs = query(collection(db, "mining_logs"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MiningLog)));
    });

    const qInvestors = query(collection(db, "investors"), where("userId", "==", user.uid));
    const unsubInvestors = onSnapshot(qInvestors, (snapshot) => {
      setInvestors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investor)));
    });

    const qWithdrawals = query(collection(db, "withdrawals"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamWithdrawal)));
    });

    updatePrices();
    const interval = setInterval(updatePrices, 60000); 

    return () => {
      unsubLogs();
      unsubInvestors();
      unsubWithdrawals();
      clearInterval(interval);
    };
  }, [user, updatePrices]);

  // Handlers Autenticação
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Handlers de Dados (Firestore)
  const addMiningLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !miningForm.amount || parseFloat(miningForm.amount) <= 0) return;
    try {
      await addDoc(collection(db, "mining_logs"), {
        userId: user.uid,
        date: miningForm.date,
        amount: parseFloat(miningForm.amount),
        status: StatusType.ARCHIVED,
        timestamp: new Date(miningForm.date).getTime()
      });
      setMiningForm({ ...miningForm, amount: '' });
    } catch (error) {
      console.error("Erro ao salvar log:", error);
    }
  };

  const addInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !investorForm.name || !investorForm.contribution) return;
    try {
      await addDoc(collection(db, "investors"), {
        userId: user.uid,
        name: investorForm.name,
        contribution: parseFloat(investorForm.contribution),
        joinedAt: Date.now()
      });
      setInvestorForm({ name: '', contribution: '' });
    } catch (error) {
      console.error("Erro ao salvar sócio:", error);
    }
  };

  const addWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawalForm.amount) return;
    try {
      await addDoc(collection(db, "withdrawals"), {
        userId: user.uid,
        date: withdrawalForm.date,
        amount: parseFloat(withdrawalForm.amount),
        description: withdrawalForm.description,
        timestamp: new Date(withdrawalForm.date).getTime()
      });
      setWithdrawalForm({ date: new Date().toISOString().split('T')[0], amount: '', description: '' });
    } catch (error) {
      console.error("Erro ao salvar retirada:", error);
    }
  };

  const removeItem = async (type: "mining_logs" | "investors" | "withdrawals", id: string) => {
    try {
      await deleteDoc(doc(db, type, id));
    } catch (error) {
      console.error("Erro ao remover item:", error);
    }
  };

  // Cálculos Financeiros
  const totalBtc = useMemo(() => logs.reduce((acc, log) => acc + log.amount, 0), [logs]);
  const totalContributionsBrl = useMemo(() => investors.reduce((acc, inv) => acc + inv.contribution, 0), [investors]);
  const totalWithdrawalsBrl = useMemo(() => withdrawals.reduce((acc, w) => acc + w.amount, 0), [withdrawals]);
  
  const miningValueBrl = useMemo(() => totalBtc * prices.brl, [totalBtc, prices.brl]);
  const currentTotalBankroll = useMemo(() => totalContributionsBrl + miningValueBrl - totalWithdrawalsBrl, 
    [totalContributionsBrl, miningValueBrl, totalWithdrawalsBrl]);

  // Loading de Auth Inicial
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="text-emerald-500 animate-spin" size={40} />
      </div>
    );
  }

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center space-y-8">
          <div className="bg-emerald-500/10 p-5 rounded-3xl w-fit mx-auto text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.1)] border border-emerald-500/20">
            <Zap size={48} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Crypto Mining</h1>
            <p className="text-zinc-400">Entre para gerenciar sua operação de mineração e sócios com cotação em tempo real.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-zinc-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all shadow-xl active:scale-[0.98]"
          >
            <LogIn size={20} />
            Entrar com Google
          </button>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Desenvolvido por Davi</p>
        </div>
      </div>
    );
  }

  // Dashboard Principal
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-20 bg-zinc-900 border-r border-zinc-800 flex lg:flex-col items-center py-6 gap-8 justify-center lg:justify-start shrink-0">
        <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <Zap size={28} />
        </div>
        <nav className="flex lg:flex-col gap-6 flex-1">
          <button onClick={() => setActiveTab('mining')} title="Mineração" className={`p-3 rounded-xl transition-all ${activeTab === 'mining' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}>
            <LayoutDashboard size={24} />
          </button>
          <button onClick={() => setActiveTab('team')} title="Equipe" className={`p-3 rounded-xl transition-all ${activeTab === 'team' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}>
            <Users size={24} />
          </button>
        </nav>
        <div className="flex lg:flex-col gap-4 items-center">
          <img src={user.photoURL || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-700" title={user.displayName || ''} />
          <button onClick={handleLogout} title="Sair" className="p-3 text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut size={22} />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Ticker Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-6 bg-zinc-900/50 border border-zinc-800 px-6 py-3 rounded-2xl shadow-inner">
           <div className="flex items-center gap-2">
              <Globe size={14} className="text-zinc-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Market Live</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex flex-col">
                 <span className="text-[10px] text-zinc-500 uppercase">BTC / USD</span>
                 <span className="text-sm font-mono font-bold text-emerald-400">
                    $ {prices.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                 </span>
              </div>
              <div className="w-px h-6 bg-zinc-800"></div>
              <div className="flex flex-col">
                 <span className="text-[10px] text-zinc-500 uppercase">BTC / BRL</span>
                 <span className="text-sm font-mono font-bold text-emerald-400">
                    R$ {prices.brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
              </div>
           </div>
           <div className="ml-auto text-[10px] text-zinc-600 flex items-center gap-2">
              <RefreshCw size={10} className={isLoadingPrices ? 'animate-spin' : ''} />
              Cotação: {new Date(prices.lastUpdated).toLocaleTimeString()}
           </div>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {activeTab === 'mining' ? 'Dashboard de Mineração' : 'Gestão de Sócios'}
          </h1>
          <p className="text-zinc-400 mt-1">
            Olá, <span className="text-white font-medium">{user.displayName?.split(' ')[0]}</span>. {activeTab === 'mining' ? 'Acompanhamento de produção e banca total.' : 'Gestão de aportes e divisão de cotas.'}
          </p>
        </header>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="xl:col-span-2">
            <PriceCard title="Banca Total (BRL)" value={currentTotalBankroll} currency="BRL" symbol="R$" color="text-white bg-emerald-500/5 border-emerald-500/20" />
          </div>
          <PriceCard title="Volume Minerado" value={totalBtc} currency="BTC" symbol="₿" color="text-orange-400" isCrypto={true} />
          <PriceCard title="Capital Social" value={totalContributionsBrl} currency="BRL" symbol="R$" color="text-blue-400" />
          <PriceCard title="Saques Equipe" value={totalWithdrawalsBrl} currency="BRL" symbol="R$" color="text-red-400" />
          <PriceCard title="Saldo Mineração" value={miningValueBrl} currency="BRL" symbol="R$" color="text-zinc-400" />
        </div>

        {activeTab === 'mining' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700 flex items-center gap-2">
                  <PlusCircle className="text-emerald-500" size={20} />
                  <h2 className="font-semibold text-lg">Lançamento de Produção</h2>
                </div>
                <form onSubmit={addMiningLog} className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase font-bold">Data da Produção</label>
                    <input type="date" value={miningForm.date} onChange={e => setMiningForm({...miningForm, date: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500 uppercase font-bold">BTC Minerado</label>
                    <input type="number" step="0.00000001" value={miningForm.amount} onChange={e => setMiningForm({...miningForm, amount: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none mono focus:border-emerald-500 transition-colors" placeholder="0.00000000" />
                  </div>
                  <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-95">Registrar Lucro</button>
                </form>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700 flex justify-between items-center">
                   <h2 className="font-semibold text-lg flex items-center gap-2"><History size={20} /> Histórico de Lançamentos</h2>
                   <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">{logs.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950">
                      <tr>
                        <th className="px-6 py-3 font-bold">Data</th>
                        <th className="px-6 py-3 font-bold">Quantidade (BTC)</th>
                        <th className="px-6 py-3 font-bold">Conversão (BRL)</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 font-mono text-sm text-zinc-300">{new Date(log.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 font-bold text-orange-400 mono">{log.amount.toFixed(8)}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono">R$ {(log.amount * prices.brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => removeItem("mining_logs", log.id)} className="text-zinc-700 group-hover:text-red-400 transition-colors"><MinusCircle size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700">
                  <h2 className="font-semibold text-lg flex items-center gap-2 text-red-400"><ArrowDownCircle size={20} /> Retiradas (Equipe)</h2>
                </div>
                <form onSubmit={addWithdrawal} className="p-6 space-y-4 border-b border-zinc-800 bg-zinc-900/40">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Valor (BRL)</label>
                    <input type="number" placeholder="R$ 0,00" value={withdrawalForm.amount} onChange={e => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-red-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Motivo/Descrição</label>
                    <input type="text" placeholder="Ex: Energia elétrica" value={withdrawalForm.description} onChange={e => setWithdrawalForm({...withdrawalForm, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-red-500/50" />
                  </div>
                  <button className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all">Registrar Saque</button>
                </form>
                <div className="max-h-[350px] overflow-y-auto p-4 space-y-2">
                  {withdrawals.map(w => (
                    <div key={w.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center group hover:border-red-500/30 transition-all">
                      <div>
                        <p className="text-sm font-bold text-white">R$ {w.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{w.description} • {new Date(w.timestamp).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => removeItem("withdrawals", w.id)} className="text-zinc-800 group-hover:text-red-400 transition-colors"><MinusCircle size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
               <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700 flex justify-between items-center">
                   <h2 className="font-semibold text-lg flex items-center gap-2 text-blue-400"><Users size={20} /> Divisão de Dividendos</h2>
                   <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 font-mono">{investors.length} ativos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950 tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-bold">Sócio</th>
                        <th className="px-6 py-3 font-bold">Aporte (BRL)</th>
                        <th className="px-6 py-3 font-bold">Cota Social</th>
                        <th className="px-6 py-3 font-bold">Saldo Dinâmico</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {investors.map(inv => {
                        const share = totalContributionsBrl > 0 ? (inv.contribution / totalContributionsBrl) : 0;
                        const currentBalance = inv.contribution + (miningValueBrl * share) - (totalWithdrawalsBrl * share);
                        const isProfit = currentBalance > inv.contribution;

                        return (
                          <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/20 uppercase">
                                  {inv.name.charAt(0)}
                               </div>
                               {inv.name}
                            </td>
                            <td className="px-6 py-4 text-zinc-400 font-mono text-sm">R$ {inv.contribution.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 font-bold">
                                {(share * 100).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`font-bold font-mono text-sm ${isProfit ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                  R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="flex items-center gap-1">
                                   <span className={`text-[10px] font-bold ${isProfit ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                      ROI: {inv.contribution > 0 ? (((currentBalance / inv.contribution) - 1) * 100).toFixed(1) : 0}%
                                   </span>
                                   {isProfit ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-zinc-600" />}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => removeItem("investors", inv.id)} className="text-zinc-800 group-hover:text-red-400 transition-colors"><MinusCircle size={18} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
               </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden self-start shadow-2xl">
              <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700">
                <h2 className="font-semibold text-lg flex items-center gap-2 text-blue-400"><UserPlus size={20} /> Cadastrar Sócio</h2>
              </div>
              <form onSubmit={addInvestor} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">Nome do Investidor</label>
                  <input type="text" placeholder="Nome completo" value={investorForm.name} onChange={e => setInvestorForm({...investorForm, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">Capital Inicial (BRL)</label>
                  <input type="number" placeholder="R$ 0,00" value={investorForm.contribution} onChange={e => setInvestorForm({...investorForm, contribution: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 outline-none mono focus:border-blue-500 transition-colors" />
                </div>
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95">
                  Efetivar Aporte
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
