import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  orderBy,
  limit,
  serverTimestamp 
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
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Cashier() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'entry' | 'exit'>('entry');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    setLoading(true);
    
    try {
      const unsubTrans = onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'), limit(50)), (snap) => {
        console.log("Cashier Transactions Snap:", snap.size);
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setLoading(false);
      }, (error) => {
        console.error("Erro ao carregar transações:", error);
        setLoading(false);
      });

      const unsubSales = onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => {
        console.log("Cashier Sales Snap:", snap.size);
        setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Erro ao carregar vendas no caixa:", error);
      });

      return () => {
        unsubTrans();
        unsubSales();
      };
    } catch (error) {
      console.error("Erro fatal no setup do Caixa:", error);
      setLoading(false);
    }
  }, [auth.currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !value || !description) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
        type: modalType,
        value: parseFloat(value.replace(',', '.')),
        description,
        brand: 'Geral',
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setValue('');
      setDescription('');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  
  const stats = (transactions || []).reduce((acc, curr) => {
    try {
      const val = Number(curr?.value) || 0;
      const isToday = curr?.date?.startsWith(today) || false;
      
      if (curr?.type === 'entry') {
        acc.totalEntries += val;
        if (isToday) acc.todayEntries += val;
      } else if (curr?.type === 'exit') {
        acc.totalExits += val;
        if (isToday) acc.todayExits += val;
      }
    } catch (e) {
      console.error("Erro ao processar transação:", e, curr);
    }
    return acc;
  }, { totalEntries: 0, totalExits: 0, todayEntries: 0, todayExits: 0 });

  const todaySalesTotal = (sales || [])
    .filter(s => s && s.date?.startsWith(today) && s.status !== 'cancelado')
    .reduce((acc, s) => acc + (Number(s?.totalValue) || 0), 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 pb-24">
      <header className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-medium text-white italic">Caixa</h1>
            <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.4em] mt-1">Fluxo de Caixa Elite</p>
          </div>
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-14 h-14 bg-white/[0.02] border border-white/5 rounded-[1.2rem] flex items-center justify-center text-premium-gold/40 shadow-inner"
          >
            <DollarSign className="w-6 h-6" />
          </motion.div>
        </div>
      </header>

      {/* Modern Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-[9px] uppercase font-black text-white/20 tracking-widest mb-2">Vendas Hoje</p>
          <p className="text-2xl font-bold text-white tracking-tighter">{formatCurrency(todaySalesTotal)}</p>
        </div>
        <div className="bg-premium-pink/[0.03] border border-premium-pink/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-premium-pink/[0.02] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-[9px] uppercase font-black text-premium-pink/40 tracking-widest mb-2">Saldo Atual</p>
          <p className="text-2xl font-bold text-premium-pink tracking-tighter">{formatCurrency(stats.totalEntries - stats.totalExits)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => { setModalType('entry'); setIsModalOpen(true); }}
          className="flex flex-col items-center gap-3 p-8 bg-green-500/[0.02] text-green-500/60 border border-green-500/10 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-500/[0.05] hover:text-green-500 transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6 text-green-500" />
          </div>
          Entrada
        </motion.button>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => { setModalType('exit'); setIsModalOpen(true); }}
          className="flex flex-col items-center gap-3 p-8 bg-red-500/[0.02] text-red-500/60 border border-red-500/10 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/[0.05] hover:text-red-500 transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6 text-red-500" />
          </div>
          Saída
        </motion.button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Timeline de Capital</h3>
          <Filter className="w-4 h-4 text-white/10" />
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-white/5 border-t-premium-pink rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
                <DollarSign className="w-16 h-16 text-white/[0.02]" />
                <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhum movimento localizado</p>
              </div>
            ) : (
              transactions.map((t, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={t.id} 
                  className="group flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all duration-500"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      t.type === 'entry' ? "bg-green-500/5 text-green-500/60" : "bg-red-500/5 text-red-500/60"
                    )}>
                      {t.type === 'entry' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/70 mb-0.5">{t.description || 'Sem descrição'}</p>
                      <p className="text-[9px] text-white/10 uppercase font-black tracking-widest leading-none">
                        {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : 'Sem data'} • {t.brand || 'Geral'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={cn(
                      "text-base font-bold tracking-tight",
                      t.type === 'entry' ? "text-green-500" : "text-red-500"
                    )}>
                      {t.type === 'entry' ? '+' : '-'} {formatCurrency(Number(t.value) || 0)}
                    </p>
                    <button onClick={() => handleDelete(t.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/0 hover:bg-red-500/10 text-white/0 group-hover:text-red-500/40 transition-all duration-300">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Premium Entry/Exit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-dark-bg/95 backdrop-blur-2xl" />
            <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} className="bg-dark-surface w-full max-w-sm rounded-[2.5rem] p-8 border border-white/5 relative shadow-2xl">
              <div className="mb-10">
                <h2 className="text-2xl font-display font-medium text-white italic">
                  Registrar {modalType === 'entry' ? 'Entrada' : 'Saída'}
                </h2>
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Gestão de caixa inteligente</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-white/20 ml-1 tracking-widest">Valor do Aporte</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">R$</span>
                    <input 
                      type="text" 
                      placeholder="0,00"
                      className="input-premium pl-12 text-2xl"
                      required
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-white/20 ml-1 tracking-widest">Justificativa</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Reforço de Caixa Elite"
                    className="input-premium"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-premium w-full !py-6 mt-4">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar Registro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
