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

  const [businessName, setBusinessName] = useState('Bruna Cosméticos');

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    setLoading(true);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 0. Business Name
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists() && snap.data().businessName) {
        setBusinessName(snap.data().businessName);
      }
    });

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
     return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Acessando sistema...</p>
        </div>
     );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{businessName}</h1>
          <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em]">Painel do Representante</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-premium-pink/20 flex items-center justify-center border border-premium-pink/20">
          <User className="text-premium-pink w-6 h-6" />
        </div>
      </header>

      {/* Primary Metrics - Visual Focus */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gradient-to-br from-premium-pink to-pink-600 p-6 rounded-[2rem] shadow-xl shadow-pink-500/10">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-white/20 p-3 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest text-white/60">Vendas Hoje</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{formatCurrency(metrics.todaySales)}</p>
          <p className="text-white/60 text-xs font-medium">Mês: {formatCurrency(metrics.monthlySales)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem]">
            <div className="text-white/40 mb-2">
              <DollarSign className="w-5 h-5 text-premium-pink" />
            </div>
            <p className="text-lg font-bold text-white">{formatCurrency(metrics.cashInHand)}</p>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Saldo em Caixa</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem]">
            <div className="text-white/40 mb-2">
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-lg font-bold text-white">{formatCurrency(metrics.pendingPayments)}</p>
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">A Receber</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/vendas')}
          className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all active:scale-95"
        >
          <div className="w-12 h-12 bg-premium-pink/10 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="text-premium-pink w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Nova Venda</span>
        </button>
        <button 
          onClick={() => navigate('/estoque')}
          className="flex flex-col items-center gap-3 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-white/10 transition-all active:scale-95"
        >
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Package className="text-white/60 w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Estoque</span>
        </button>
      </div>

      {/* System Status / Alerts */}
      <div className="space-y-4">
        <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 px-2 italic">Atenção Necessária</h3>
        
        <div className="space-y-2">
          {metrics.lowStock > 0 && (
            <div className="flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <AlertCircle className="text-red-400 w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{metrics.lowStock} itens críticos</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Reposição de estoque necessária</p>
              </div>
              <button 
                onClick={() => navigate('/estoque')}
                className="p-2 text-red-100/50 hover:text-red-400"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {metrics.pendingOrders > 0 && (
            <div className="flex items-center gap-4 p-4 bg-premium-pink/5 border border-premium-pink/10 rounded-2xl">
              <ShoppingCart className="text-premium-pink w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{metrics.pendingOrders} pedidos pendentes</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Aguardando entrega/pagamento</p>
              </div>
              <button 
                onClick={() => navigate('/vendas')}
                className="p-2 text-premium-pink/50 hover:text-premium-pink"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {metrics.lowStock === 0 && metrics.pendingOrders === 0 && (
            <div className="p-8 text-center border border-dashed border-white/5 rounded-3xl">
              <Check className="w-10 h-10 mx-auto mb-2 text-green-500/20" />
              <p className="text-[10px] uppercase font-black tracking-widest text-white/10">Tudo em dia por aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
