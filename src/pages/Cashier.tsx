import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Transaction, Brand } from '../types';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  Loader2,
  DollarSign,
  TrendingUp,
  PieChart,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Cashier() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBrand, setFilterBrand] = useState<Brand | 'Geral' | 'Todas'>('Todas');

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'), limit(100));
    
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const cashierStats = transactions.reduce((acc, curr) => {
    const val = curr.value;
    const isEntry = curr.type === 'entry';
    
    // Total Geral
    acc.total += isEntry ? val : -val;
    if (isEntry) acc.entries += val; else acc.exits += val;

    // By Brand
    if (curr.brand === 'O Boticário') {
      acc.bot += isEntry ? val : -val;
    } else if (curr.brand === 'Mary Kay') {
      acc.mk += isEntry ? val : -val;
    }
    
    return acc;
  }, { total: 0, entries: 0, exits: 0, bot: 0, mk: 0 });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Deseja excluir este registro de movimentação?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    filterBrand === 'Todas' || t.brand === filterBrand
  );

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1">Caixa</h1>
            <p className="text-white/40 text-sm italic font-light tracking-wide italic">Fluxo de prosperidade.</p>
          </div>
          <div className="w-14 h-14 bg-premium-pink/10 rounded-2xl flex items-center justify-center text-premium-pink border border-premium-pink/20 shadow-lg shadow-premium-pink/10">
            <Wallet className="w-7 h-7" />
          </div>
        </div>
      </header>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-premium-pink" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-premium-pink/20 flex items-center justify-center text-premium-pink border border-premium-pink/30">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Saldo Total</h3>
            </div>
            <p className="text-4xl font-display text-white mb-4">{formatCurrency(cashierStats.total)}</p>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
              <span className="text-green-400/80 flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3" /> {formatCurrency(cashierStats.entries)}</span>
              <span className="text-red-400/80 flex items-center gap-1.5"><ArrowDownLeft className="w-3 h-3" /> {formatCurrency(cashierStats.exits)}</span>
            </div>
          </div>
        </motion.div>

        <div className="card-premium border-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
              <span className="text-[10px] font-bold">OB</span>
            </div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/20">O Boticário</h3>
          </div>
          <p className="text-2xl font-display text-white">{formatCurrency(cashierStats.bot)}</p>
          <div className="mt-4 pt-4 border-t border-white/5">
           <span className="text-[9px] uppercase font-black text-white/10 tracking-[0.3em]">Capital Ativo</span>
          </div>
        </div>

        <div className="card-premium border-white/5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-premium-pink/10 flex items-center justify-center text-premium-pink">
              <span className="text-[10px] font-bold">MK</span>
            </div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/20">Mary Kay</h3>
          </div>
          <p className="text-2xl font-display text-white">{formatCurrency(cashierStats.mk)}</p>
          <div className="mt-4 pt-4 border-t border-white/5">
           <span className="text-[9px] uppercase font-black text-white/10 tracking-[0.3em]">Capital Ativo</span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card-premium border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-display text-white italic">Movimentações</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold mt-1">Histórico recente de transações</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {['Todas', 'O Boticário', 'Mary Kay', 'Geral'].map((b) => (
              <button
                key={b}
                onClick={() => setFilterBrand(b as any)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                  filterBrand === b 
                    ? "bg-premium-pink text-black shadow-lg shadow-premium-pink/20" 
                    : "bg-white/5 text-white/30 hover:bg-white/10 border border-white/5"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <PieChart className="w-12 h-12 text-white/5" />
                <p className="text-white/20 font-display text-xl uppercase tracking-widest italic">Acervo vazio</p>
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                      t.type === 'entry' 
                        ? "bg-green-500/5 text-green-500 border-green-500/10 group-hover:bg-green-500/10" 
                        : "bg-red-500/5 text-red-500 border-red-500/10 group-hover:bg-red-500/10"
                    )}>
                      {t.type === 'entry' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-display text-lg text-white group-hover:text-premium-pink transition-colors leading-tight italic">{t.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">{t.brand}</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn(
                        "font-display text-xl",
                        t.type === 'entry' ? "text-green-400" : "text-red-400"
                      )}>
                        {t.type === 'entry' ? '+' : '-'} {formatCurrency(t.value)}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="w-10 h-10 flex items-center justify-center bg-red-400/5 text-red-400 border border-red-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
