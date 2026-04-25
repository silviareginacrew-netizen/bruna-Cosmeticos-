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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    monthlySales: 0,
    debtorsCount: 0,
    lowStock: 0,
    cashInHand: 0,
    activeConsortiums: 0,
    overdueInstallments: 0
  });

  const [businessName, setBusinessName] = useState('Sua Loja');
  const [copied, setCopied] = useState(false);

  const copyCatalogLink = () => {
    if (!auth.currentUser) return;
    const url = `${window.location.origin}/catalogo/${auth.currentUser.uid}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;

    // 0. Business Name
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists() && snap.data().businessName) {
        setBusinessName(snap.data().businessName);
      }
    });

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // 1. Low stock
    const stockQuery = query(collection(db, 'users', userId, 'inventory'), where('quantity', '<=', 5));
    const unsubStock = onSnapshot(stockQuery, (snap) => {
      setMetrics(prev => ({ ...prev, lowStock: snap.size }));
    });

    // 2. Active Consortiums
    const consortiumQuery = query(collection(db, 'users', userId, 'consortiums'), where('status', '==', 'active'));
    const unsubConsortium = onSnapshot(consortiumQuery, (snap) => {
      setMetrics(prev => ({ ...prev, activeConsortiums: snap.size }));
    });

    // 3. Monthly Sales
    const salesQuery = query(
      collection(db, 'users', userId, 'sales'),
      where('date', '>=', firstDayOfMonth)
    );
    const unsubSales = onSnapshot(salesQuery, (snap) => {
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().totalValue || 0), 0);
      setMetrics(prev => ({ ...prev, monthlySales: total }));
    });

    // 4. Cash in Hand (Balance)
    const transQuery = query(collection(db, 'users', userId, 'transactions'));
    const unsubTrans = onSnapshot(transQuery, (snap) => {
      const balance = snap.docs.reduce((acc, doc) => {
        const data = doc.data();
        return acc + (data.type === 'entry' ? data.value : -data.value);
      }, 0);
      setMetrics(prev => ({ ...prev, cashInHand: balance }));
    });

    // 5. Overdue / Debtors (Checking all consortiums' installments)
    // Optimized to avoid nested onSnapshot listeners
    const installmentsQuery = query(collectionGroup(db, 'installments'), where('status', '==', 'pending'));
    // Note: collectionGroup requires an index, but we can't easily set that up here.
    // Instead, we'll stick to a more controlled fetch or a single listener if possible.
    // Given the constraints, let's just listen to all consortiums and do a batch check.
    
    const allConsortiumsQuery = query(collection(db, 'users', userId, 'consortiums'));
    const unsubAllCons = onSnapshot(allConsortiumsQuery, async (snap) => {
      let count = 0;
      const now = new Date().toISOString();
      
      // We'll use a simple approach: just get the count from the subcollections once when consortiums change
      // This is slightly less "real-time" than nested listeners but way safer.
      for (const conDoc of snap.docs) {
        const insSnap = await getDocs(query(collection(db, 'users', userId, 'consortiums', conDoc.id, 'installments'), where('status', '==', 'pending')));
        count += insSnap.docs.filter(d => d.data().dueDate < now).length;
      }
      setMetrics(prev => ({ ...prev, overdueInstallments: count }));
    });

    setLoading(false);

    return () => {
      unsubStock();
      unsubConsortium();
      unsubSales();
      unsubTrans();
      unsubAllCons();
    };
  }, [auth.currentUser]);

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Carregando painel...</p>
        </div>
     );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-10 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1 uppercase tracking-tighter">{businessName}</h1>
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
            onClick={() => navigate(`/catalogo/${auth.currentUser?.uid}?tab=boticario`)}
            className="card-premium bg-gradient-to-br from-dark-surface to-premium-pink/5 border-white/5 flex flex-col items-center justify-center p-8 gap-4 group hover:border-premium-pink/40 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute -right-4 -top-4 w-12 h-12 bg-premium-pink/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <Package className="w-8 h-8 text-premium-pink mb-1" />
            <span className="font-display text-xl text-white">O Boticário</span>
            <span className="text-[8px] uppercase tracking-[0.25em] text-white/20 font-black">Vitrine Pública</span>
          </button>
          <button 
            onClick={() => navigate(`/catalogo/${auth.currentUser?.uid}?tab=marykay`)}
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
            value={formatCurrency(metrics.monthlySales)} 
            icon={TrendingUp} 
            color="gold"
          />
        </div>
        <MetricCard 
          title="Saldo Caixa" 
          value={formatCurrency(metrics.cashInHand)} 
          icon={DollarSign} 
          color="white"
        />
        <MetricCard 
          title="Consórcios Ativos" 
          value={metrics.activeConsortiums} 
          icon={Users} 
          color="gold"
        />
        <MetricCard 
          title="Estoque Crítico" 
          value={metrics.lowStock} 
          icon={AlertCircle} 
          color="pink"
        />
        <MetricCard 
          title="Parcelas Vencidas" 
          value={metrics.overdueInstallments} 
          icon={Calendar} 
          color="pink"
        />
      </section>

      <div className="space-y-6">
        <h3 className="font-display text-2xl px-1">Alertas do Sistema</h3>
        <div className="space-y-3">
          {metrics.lowStock === 0 && metrics.overdueInstallments === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/5 rounded-3xl opacity-20">
              <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="text-[10px] uppercase font-black tracking-widest">Nenhum alerta pendente</p>
            </div>
          ) : (
            <>
              {metrics.lowStock > 0 && (
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="p-5 rounded-2xl border border-pink-500/20 bg-pink-500/5 text-red-100 flex items-center gap-4 transition-all"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <p className="text-sm font-medium tracking-wide">Existem {metrics.lowStock} itens com estoque baixo.</p>
                </motion.div>
              )}
              {metrics.overdueInstallments > 0 && (
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-100 flex items-center gap-4 transition-all"
                >
                  <Calendar className="w-5 h-5 shrink-0 text-red-400" />
                  <p className="text-sm font-medium tracking-wide">Existem {metrics.overdueInstallments} parcelas vencidas.</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
