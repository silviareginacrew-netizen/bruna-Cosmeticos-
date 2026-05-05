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
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    
    const unsubTrans = onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'), limit(50)), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setLoading(false);
    });

    const unsubSales = onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTrans();
      unsubSales();
    };
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
  
  const stats = transactions.reduce((acc, curr) => {
    const isToday = curr.date?.startsWith(today);
    if (curr.type === 'entry') {
      acc.totalEntries += curr.value;
      if (isToday) acc.todayEntries += curr.value;
    } else {
      acc.totalExits += curr.value;
      if (isToday) acc.todayExits += curr.value;
    }
    return acc;
  }, { totalEntries: 0, totalExits: 0, todayEntries: 0, todayExits: 0 });

  const todaySalesTotal = sales
    .filter(s => s.date?.startsWith(today) && s.status !== 'cancelado')
    .reduce((acc, s) => acc + (s.totalValue || 0), 0);

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
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Caixa</h1>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em]">Fluxo Financeiro Diário</p>
          </div>
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
          <p className="text-[8px] uppercase font-black text-white/30 tracking-widest mb-1">Vendas Hoje</p>
          <p className="text-lg font-bold text-white">{formatCurrency(todaySalesTotal)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
          <p className="text-[8px] uppercase font-black text-white/30 tracking-widest mb-1">Saldo Atual</p>
          <p className="text-lg font-bold text-premium-pink">{formatCurrency(stats.totalEntries - stats.totalExits)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => { setModalType('entry'); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 p-4 bg-green-500/10 text-green-500 border border-green-500/10 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
        >
          <ArrowUpRight className="w-4 h-4" /> Entrada
        </button>
        <button 
          onClick={() => { setModalType('exit'); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
        >
          <ArrowDownLeft className="w-4 h-4" /> Saída
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20 px-1">Movimentações Recentes</h3>
        
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-white/20" /></div>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="group flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    t.type === 'entry' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {t.type === 'entry' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/80">{t.description}</p>
                    <p className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">
                      {new Date(t.date).toLocaleDateString('pt-BR')} • {t.brand}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={cn(
                    "text-sm font-bold",
                    t.type === 'entry' ? "text-green-400" : "text-red-400"
                  )}>
                    {t.type === 'entry' ? '+' : '-'} {formatCurrency(t.value)}
                  </p>
                  <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-white/10 hover:text-red-400 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry/Exit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-surface w-full max-w-sm rounded-[2rem] p-6 border border-white/10 relative shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-tighter">
                Registrar {modalType === 'entry' ? 'Entrada' : 'Saída'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-white/40 mb-2 block tracking-widest">Valor</label>
                  <input 
                    type="text" 
                    placeholder="0,00"
                    className="input-premium text-2xl"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-white/40 mb-2 block tracking-widest">Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Aluguel, Reforço de Caixa..."
                    className="input-premium"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-premium w-full py-4 mt-4">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
