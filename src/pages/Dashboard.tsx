import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Sale, Client, Consortium, Transaction } from '../types';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Check,
  ShoppingCart
} from 'lucide-react';
import { motion } from 'motion/react';
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
  const [metrics, setMetrics] = useState({
    monthlySales: 0,
    debtorsCount: 0,
    lowStock: 0,
    cashInHand: 0,
    activeConsortiums: 0,
    overdueInstallments: 0
  });
  const [copied, setCopied] = useState(false);

  const copyCatalogLink = () => {
    if (!auth.currentUser) return;
    const url = `${window.location.origin}/catalogo/${auth.currentUser.uid}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    // Real-time listeners for dashboard metrics
    // In a real app, some of these would be calculated or aggregated
    
    // Low stock
    const stockQuery = query(collection(db, 'users', userId, 'inventory'), where('quantity', '<=', 5));
    const unsubStock = onSnapshot(stockQuery, (snap) => {
      setMetrics(prev => ({ ...prev, lowStock: snap.size }));
    });

    // Active Consortiums
    const consortiumQuery = query(collection(db, 'users', userId, 'consortiums'), where('status', '==', 'active'));
    const unsubConsortium = onSnapshot(consortiumQuery, (snap) => {
      setMetrics(prev => ({ ...prev, activeConsortiums: snap.size }));
    });

    // We would add more listeners and calculations here
    
    return () => {
      unsubStock();
      unsubConsortium();
    };
  }, []);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-10 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1 uppercase tracking-tighter">Bruna Cosméticos</h1>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.4em]">Seu império de beleza pessoal</p>
          </div>
          <button 
            onClick={copyCatalogLink}
            className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center hover:bg-premium-pink transition-all duration-700 group shadow-xl"
          >
            {copied ? <Check className="w-6 h-6 text-black" /> : <Share2 className="w-6 h-6 text-premium-pink group-hover:text-black" />}
          </button>
        </div>

        {/* Brand Selection / Quick Access */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => window.location.href = `/catalogo/${auth.currentUser?.uid}?tab=boticario`}
            className="card-premium bg-gradient-to-br from-dark-surface to-premium-pink/5 border-white/5 flex flex-col items-center justify-center p-8 gap-4 group hover:border-premium-pink/40 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-premium-pink/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <Package className="w-8 h-8 text-premium-pink mb-1" />
            <span className="font-display text-xl text-white">O Boticário</span>
            <span className="text-[8px] uppercase tracking-[0.25em] text-white/20 font-black">Vitrine Pública</span>
          </button>
          <button 
            onClick={() => window.location.href = `/catalogo/${auth.currentUser?.uid}?tab=marykay`}
            className="card-premium bg-gradient-to-br from-dark-surface to-white/5 border-white/5 flex flex-col items-center justify-center p-8 gap-4 group hover:border-white/20 transition-all duration-500 overflow-hidden relative"
          >
            <Package className="w-8 h-8 text-white/40 mb-1" />
            <span className="font-display text-xl text-white">Mary Kay</span>
            <span className="text-[8px] uppercase tracking-[0.25em] text-white/20 font-black">Vitrine Pública</span>
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4 h-fit">
        <div className="col-span-2 lg:col-span-1">
          <MetricCard 
            title="Vendas Mensais" 
            value={formatCurrency(12450.50)} 
            icon={TrendingUp} 
            trend="+18%" 
            color="gold"
          />
        </div>
        <MetricCard 
          title="Saldo Caixa" 
          value={formatCurrency(4500.00)} 
          icon={DollarSign} 
          color="white"
        />
        <MetricCard 
          title="Inadimplência" 
          value={12} 
          icon={Users} 
          color="pink"
        />
        <MetricCard 
          title="Estoque Crítico" 
          value={metrics.lowStock} 
          icon={AlertCircle} 
          color="pink"
        />
        <MetricCard 
          title="Parcelas Vencidas" 
          value={5} 
          icon={Calendar} 
          color="pink"
        />
      </section>

      <div className="space-y-6">
        <h3 className="font-display text-2xl px-1">Alertas do Sistema</h3>
        <div className="space-y-3">
          {[
            { id: 1, type: 'stock', msg: 'Perfume Malbec Gold - Estoque Crítico (1 unid)', color: 'border-red-500/20 bg-red-500/5 text-red-400' },
            { id: 2, type: 'payment', msg: 'Parcela vencida: Maria Silva (Consórcio MK)', color: 'border-red-500/20 bg-red-500/5 text-red-400' },
            { id: 3, type: 'client', msg: 'Cliente em atraso: João Pereira', color: 'border-white/5 bg-white/5 text-white/60' },
          ].map((alert) => (
            <motion.div 
              whileHover={{ x: 5 }}
              key={alert.id} 
              className={cn("p-5 rounded-2xl border flex items-center gap-4 transition-all", alert.color)}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium tracking-wide">{alert.msg}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
