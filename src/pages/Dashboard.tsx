import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  getDocs,
  collectionGroup,
  getDoc,
  doc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import Logo from '../components/ui/Logo';
import { Product, Sale, Client, Consortium, Transaction } from '../types';
import { 
  TrendingUp, 
  Users, 
  User,
  Package, 
  AlertCircle, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Check,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color?: 'gold' | 'pink' | 'white';
}

function MetricCard({ title, value, icon: Icon, trend, color = 'white' }: MetricCardProps) {
  const colors = {
    gold: 'text-premium-pink bg-premium-pink/10 border-premium-pink/20',
    pink: 'text-red-400 bg-red-400/10 border-red-400/20',
    white: 'text-white bg-white/5 border-white/10',
  };

  return (
    <div className="card-premium h-full flex flex-col justify-between group hover:border-premium-pink/30 transition-all duration-500">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-semibold text-green-400 flex items-center gap-1 bg-green-400/10 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">{title}</h3>
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    monthlySales: 0,
    cashInHand: 0,
    lowStock: 0,
    pendingPayments: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    setLoading(true);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. Low stock
    const unsubStock = onSnapshot(query(collection(db, 'users', userId, 'inventory'), where('quantity', '<=', 3)), (snap) => {
      setMetrics(prev => ({ ...prev, lowStock: snap.size }));
    });

    // 2. Sales (Today & Month & Pending)
    const unsubSales = onSnapshot(collection(db, 'users', userId, 'sales'), (snap) => {
      let todayTotal = 0;
      let monthTotal = 0;
      let pendingStatus = 0;

      snap.docs.forEach(doc => {
        const data = doc.data();
        const saleDate = data.date || '';
        if (saleDate.startsWith(todayStr)) todayTotal += (data.totalValue || 0);
        if (saleDate >= firstDayOfMonth) monthTotal += (data.totalValue || 0);
        if (data.status === 'pendente') pendingStatus++;
      });
      
      setMetrics(prev => ({ ...prev, todaySales: todayTotal, monthlySales: monthTotal, pendingOrders: pendingStatus }));
    });

    // 3. Transactions (Cashier Balance & Pending Payments)
    const unsubTrans = onSnapshot(collection(db, 'users', userId, 'transactions'), (snap) => {
      let balance = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        balance += (data.type === 'entry' ? data.value : -data.value);
      });
      setMetrics(prev => ({ ...prev, cashInHand: balance }));
    });

    // 4. Clients Debt
    const unsubClients = onSnapshot(collection(db, 'users', userId, 'clients'), (snap) => {
      const debt = snap.docs.reduce((acc, doc) => acc + (doc.data().totalDebt || 0), 0);
      setMetrics(prev => ({ ...prev, pendingPayments: debt }));
    });

    setLoading(false);

    return () => {
      unsubStock();
      unsubSales();
      unsubTrans();
      unsubClients();
    };
  }, [auth.currentUser]);

  if (loading) {
     return null; // Layout handles splash or we can show a minimal loader
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-12 pb-24">
      {/* Header with Luxury Brand Identity */}
      <header className="flex flex-col items-center justify-center text-center py-12 gap-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-premium-pink/10 blur-[100px] rounded-full pointer-events-none" />
        
        <Logo size="lg" className="mb-6" />
        
        <div className="space-y-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 mb-2 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-premium-pink" />
            <span className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Painel de Controle Elite</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-7xl font-display font-medium text-white tracking-tighter italic leading-none"
          >
            Olá, <span className="text-premium-pink">Bruna</span>
          </motion.h1>
          <p className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20 mt-4">Sua visão executiva para hoje</p>
        </div>
      </header>

      {/* Main Financial Cards - The "Caixa" Home section */}
      <div className="grid grid-cols-1 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="bg-premium-gradient p-10 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(233,30,99,0.4)] relative overflow-hidden group border border-white/10"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-[90px] rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-[2000ms]" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 blur-[50px] rounded-full -ml-20 -mb-20" />
          
          <div className="flex justify-between items-start mb-14 relative z-10">
            <div className="bg-white/20 p-5 rounded-[1.5rem] backdrop-blur-xl border border-white/10 shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/60 mb-2 font-display italic">Faturamento do Dia</p>
              <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg backdrop-blur-md">
                <Calendar className="w-3 h-3 text-white/40" />
                <p className="text-white/60 text-[9px] font-black uppercase tracking-tighter">Mês: {formatCurrency(metrics.monthlySales)}</p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10">
            <p className="text-6xl font-bold text-white mb-3 tracking-tighter">{formatCurrency(metrics.todaySales)}</p>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]" />
              <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.3em]">Monitoramento Real-time</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -8 }} 
            className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6 group hover:border-premium-pink/20 transition-all duration-500"
          >
            <div className="w-12 h-12 bg-premium-pink/10 rounded-2xl flex items-center justify-center group-hover:bg-premium-pink/20 transition-colors">
              <DollarSign className="w-6 h-6 text-premium-pink" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1 tracking-tight">{formatCurrency(metrics.cashInHand)}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black">Em Disponibilidade</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -8 }} 
            className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6 group hover:border-white/20 transition-all duration-500"
          >
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Users className="w-6 h-6 text-white/40" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1 tracking-tight">{formatCurrency(metrics.pendingPayments)}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black">Em Negociação</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions - Floating Menu Style */}
      <div className="space-y-8">
        <h3 className="text-[10px] uppercase font-black tracking-[0.6em] text-white/10 text-center">Operações Estratégicas</h3>
        <div className="grid grid-cols-2 gap-8">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/vendas')}
            className="flex flex-col items-center gap-5 p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.05] transition-all group"
          >
            <div className="w-16 h-16 bg-premium-pink/10 rounded-[1.8rem] flex items-center justify-center group-hover:rotate-12 transition-all duration-700">
              <ShoppingCart className="text-premium-pink w-7 h-7" />
            </div>
            <span className="text-[10px] font-black text-white/40 group-hover:text-white uppercase tracking-[0.3em] transition-colors">Vender</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/estoque')}
            className="flex flex-col items-center gap-5 p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.05] transition-all group"
          >
            <div className="w-16 h-16 bg-white/5 rounded-[1.8rem] flex items-center justify-center group-hover:-rotate-12 transition-all duration-700">
              <Package className="text-white/20 w-7 h-7 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[10px] font-black text-white/40 group-hover:text-white uppercase tracking-[0.3em] transition-colors">Acervo</span>
          </motion.button>
        </div>
      </div>

      {/* Notifications / Priority Items */}
      {(metrics.lowStock > 0 || metrics.pendingOrders > 0) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20 italic">Ações Pendentes</h3>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          
          <div className="space-y-4">
            {metrics.lowStock > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-5 p-6 bg-red-500/[0.02] border border-red-500/10 rounded-[2rem] group hover:bg-red-500/[0.05] transition-all"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle className="text-red-400 w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5">{metrics.lowStock} itens no limite</p>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Reposição de estoque urgente</p>
                </div>
                <button onClick={() => navigate('/estoque')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                  <ArrowUpRight className="w-5 h-5 text-white/40" />
                </button>
              </motion.div>
            )}

            {metrics.pendingOrders > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-5 p-6 bg-premium-gold/[0.02] border border-premium-gold/10 rounded-[2rem] group hover:bg-premium-gold/[0.05] transition-all"
              >
                <div className="w-12 h-12 bg-premium-gold/10 rounded-2xl flex items-center justify-center shrink-0">
                  <ShoppingCart className="text-premium-gold w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5">{metrics.pendingOrders} pedidos abertos</p>
                  <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Verificar entregas e pagamentos</p>
                </div>
                <button onClick={() => navigate('/vendas')} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                  <ArrowUpRight className="w-5 h-5 text-white/40" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
