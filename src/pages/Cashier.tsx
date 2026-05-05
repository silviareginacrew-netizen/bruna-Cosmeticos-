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
import { Transaction } from '../types';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  DollarSign,
  TrendingUp,
  Trash2,
  Calendar,
  Download,
  BarChart3,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Cashier() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'entry' | 'exit'>('entry');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    setLoading(true);
    setError(null);
    
    try {
      const unsubTrans = onSnapshot(query(collection(db, 'users', userId, 'transactions'), orderBy('date', 'desc'), limit(100)), (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (err) => {
        console.error("Erro ao carregar transações:", err);
        setError("Não foi possível carregar o histórico financeiro.");
        setLoading(false);
      });

      const unsubSales = onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => {
        setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error("Erro ao carregar vendas:", err);
      });

      return () => {
        unsubTrans();
        unsubSales();
      };
    } catch (e) {
      console.error("Erro setup Cashier:", e);
      setError("Falha crítica no sistema financeiro.");
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

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Excluir este registro permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Financial Logic
  const today = new Date().toISOString().split('T')[0];
  
  const stats = (transactions || []).reduce((acc, curr) => {
    const val = Number(curr?.value) || 0;
    const profitVal = Number(curr?.profit) || 0;
    const isToday = curr?.date?.startsWith(today);
    
    if (curr?.type === 'entry') {
      acc.totalEntries += val;
      acc.totalProfit += profitVal;
      if (isToday) {
        acc.todayEntries += val;
        acc.todayProfit += profitVal;
      }
    } else {
      acc.totalExits += val;
      if (isToday) acc.todayExits += val;
    }
    return acc;
  }, { totalEntries: 0, totalExits: 0, todayEntries: 0, todayExits: 0, totalProfit: 0, todayProfit: 0 });

  // Chart Data (Last 7 days)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    
    const daySales = transactions
      .filter(t => t.type === 'entry' && t.date?.startsWith(dateStr))
      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    
    return { name: dayName, value: daySales };
  });

  // Monthly Report Logic
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const monthlyMetrics = (transactions || []).reduce((acc, t) => {
    const date = new Date(t.date || '');
    const m = date.getMonth();
    const y = date.getFullYear();
    const key = `${m}-${y}`;
    
    if (!acc[key]) acc[key] = { sales: 0, profit: 0, expenses: 0, count: 0 };
    
    const val = Number(t.value) || 0;
    const prof = Number(t.profit) || 0;
    
    if (t.type === 'entry') {
      acc[key].sales += val;
      acc[key].profit += prof;
      acc[key].count += 1;
    } else {
      acc[key].expenses += val;
    }
    return acc;
  }, {} as Record<string, any>);

  const currentMonthData = monthlyMetrics[`${selectedMonth}-${selectedYear}`] || { sales: 0, profit: 0, expenses: 0, count: 0 };

  const exportReport = () => {
    const report = `
RELATÓRIO FINANCEIRO - BRUNA COSMÉTICOS
Período: ${months[selectedMonth]} ${selectedYear}

TOTAL VENDIDO: ${formatCurrency(currentMonthData.sales)}
LUCRO ESTIMADO: ${formatCurrency(currentMonthData.profit)}
DESPESAS TOTAIS: ${formatCurrency(currentMonthData.expenses)}
SALDO DO PERÍODO: ${formatCurrency(currentMonthData.sales - currentMonthData.expenses)}
QTD VENDAS: ${currentMonthData.count}

Gerado em: ${new Date().toLocaleString('pt-BR')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${months[selectedMonth]}_${selectedYear}.txt`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
        <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando Sistema Financeiro</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-6">
        <DollarSign className="w-16 h-16 text-red-500/20" />
        <p className="text-white/40 uppercase font-black tracking-widest text-xs">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-premium">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-medium text-white italic">Caixa</h1>
            <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.4em] mt-1">Visão Executiva do Faturamento</p>
          </div>
          <div className="flex gap-3">
             <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={() => { setModalType('exit'); setIsModalOpen(true); }}
               className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-colors"
             >
               <ArrowDownLeft className="w-5 h-5" />
             </motion.button>
             <motion.button 
               whileTap={{ scale: 0.9 }}
               onClick={() => { setModalType('entry'); setIsModalOpen(true); }}
               className="w-12 h-12 bg-premium-pink/10 border border-premium-pink/20 rounded-2xl flex items-center justify-center text-premium-pink"
             >
               <Plus className="w-6 h-6" />
             </motion.button>
          </div>
        </div>
      </header>

      {/* Primary Financial Stats */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-premium-gradient p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group col-span-2"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
          <div className="relative z-10 flex justify-between items-start mb-8">
             <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                <TrendingUp className="w-6 h-6 text-white" />
             </div>
             <p className="text-[10px] uppercase font-black text-white/60 tracking-widest">Saldo total acumulado</p>
          </div>
          <p className="text-4xl font-bold text-white tracking-tighter mb-1">{formatCurrency(stats.totalEntries - stats.totalExits)}</p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
             <p className="text-[9px] uppercase font-black text-white/40 tracking-widest">Consolidado Real-time</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem]"
        >
           <p className="text-[9px] uppercase font-black text-green-500/60 tracking-widest mb-2 font-display italic">Lucro Total</p>
           <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(stats.totalProfit)}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem]"
        >
           <p className="text-[9px] uppercase font-black text-red-500/60 tracking-widest mb-2 font-display italic">Total Saídas</p>
           <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(stats.totalExits)}</p>
        </motion.div>
      </div>

      {/* Chart Section */}
      <section className="space-y-6">
         <div className="flex items-center gap-3 px-2">
            <BarChart3 className="w-4 h-4 text-premium-pink" />
            <h3 className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Vendas: Últimos 7 dias</h3>
         </div>
         <div className="h-48 w-full bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <defs>
                     <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E91E63" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#E91E63" stopOpacity={0.2}/>
                     </linearGradient>
                  </defs>
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                     ))}
                  </Bar>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.1)', fontSize: 9, fontWeight: 900}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                    contentStyle={{backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px'}}
                    itemStyle={{color: '#E91E63', fontSize: '10px', fontWeight: 'bold'}}
                    labelStyle={{color: 'rgba(255,255,255,0.2)', fontSize: '9px'}}
                  />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </section>

      {/* Monthly Report Card */}
      <section className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
               <Calendar className="w-4 h-4 text-premium-gold/40" />
               <h3 className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Relatório Mensal</h3>
            </div>
            <button onClick={exportReport} className="flex items-center gap-2 text-[9px] font-black uppercase text-premium-pink tracking-widest hover:opacity-80 transition-opacity">
               <Download className="w-3 h-3" /> Exportar .txt
            </button>
         </div>

         <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <button onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)} className="p-2 text-white/20 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
               </button>
               <span className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{months[selectedMonth]} {selectedYear}</span>
               <button onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)} className="p-2 text-white/20 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
               </button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-8">
               <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-white/20 tracking-widest">Total Vendas</p>
                  <p className="text-xl font-bold text-white tracking-tighter">{formatCurrency(currentMonthData.sales)}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-white/20 tracking-widest">Lucro do Mês</p>
                  <p className="text-xl font-bold text-premium-pink tracking-tighter">{formatCurrency(currentMonthData.profit)}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-white/20 tracking-widest">Despesas</p>
                  <p className="text-xl font-bold text-white/60 tracking-tighter">{formatCurrency(currentMonthData.expenses)}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-white/20 tracking-widest">Qtd Vendas</p>
                  <p className="text-xl font-bold text-white tracking-tighter">{currentMonthData.count} <span className="text-[9px] opacity-20">ops</span></p>
               </div>
            </div>
         </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 italic">Movimentações Recentes</h3>
          <Filter className="w-3 h-3 text-white/10" />
        </div>
        
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <DollarSign className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Sem movimentações no período</p>
            </div>
          ) : (
            transactions.map((t, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
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
                    <p className="text-sm font-bold text-white/70 mb-0.5 truncate max-w-[120px]">{t.description || 'Sem descrição'}</p>
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] text-white/10 uppercase font-black tracking-widest leading-none">
                        {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : 'Sem data'}
                       </p>
                       {t.profit > 0 && (
                          <span className="text-[8px] text-premium-pink font-black uppercase tracking-tighter bg-premium-pink/5 px-1.5 py-0.5 rounded italic">Lucro: {formatCurrency(t.profit)}</span>
                       )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
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
      </section>

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
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Gestão de capital inteligente</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-white/20 ml-1 tracking-widest">Valor do Aporte</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-bold font-display italic">R$</span>
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
                    placeholder="Ex: Reforço de Caixa"
                    className="input-premium"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-premium w-full !py-6 mt-4 flex items-center justify-center">
                  {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirmar Registro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
