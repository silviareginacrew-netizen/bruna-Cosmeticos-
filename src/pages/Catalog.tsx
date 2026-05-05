import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { 
  getDoc,
  doc,
  collection, 
  query, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product } from '../types';
import Logo from '../components/ui/Logo';
import { 
  Search, 
  Loader2,
  MessageCircle,
  Package,
  Stars,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

type TabType = 'Promoções' | 'O Boticário' | 'Mary Kay' | 'Novidades' | 'Mais Vendidos';

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'O Boticário' | 'Mary Kay' | 'Todos'>('Todos');

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    const q = query(collection(db, 'users', userId, 'inventory'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    return () => unsub();
  }, [auth.currentUser]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'Todos' || p.brand === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 pb-32">
      <header>
        <h1 className="text-3xl font-display font-medium text-white italic">Catálogo</h1>
        <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Acervo Bruna Cosméticos</p>
      </header>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-premium-pink transition-colors" />
        <input 
          type="text" 
          placeholder="Encontrar produto no acervo..."
          className="input-premium pl-12"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {['Todos', 'O Boticário', 'Mary Kay'].map((tab, idx) => (
          <motion.button
            key={tab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-8 py-3 rounded-2xl text-[9px] uppercase font-black tracking-[0.2em] transition-all whitespace-nowrap border",
              activeTab === tab 
                ? "bg-premium-pink text-white border-premium-pink shadow-lg shadow-premium-pink/20" 
                : "bg-white/[0.03] text-white/30 border-white/5 hover:border-white/10"
            )}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando acervo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProducts.map((p, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              key={p.id} 
              className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 flex justify-between items-center group hover:translate-y-[-4px] transition-all duration-500"
            >
              <div className="space-y-2">
                <p className="text-[9px] uppercase font-black text-premium-pink tracking-[0.3em] mb-1 italic font-display">{p.brand}</p>
                <h3 className="text-white font-medium text-xl italic font-display group-hover:text-premium-pink transition-colors">{p.name}</h3>
                <div className="flex items-center gap-4 mt-2">
                  <span className={cn(
                    "text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest",
                    p.quantity > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {p.quantity > 0 ? 'Disponível' : 'Esgotado'}
                  </span>
                  <span className="text-white/10 text-[8px] uppercase font-black tracking-widest">
                    {p.quantity} Unidades em Reserva
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white tracking-tighter">{formatCurrency(p.sellPrice)}</p>
                <p className="text-[8px] uppercase text-white/10 font-black tracking-widest mt-1 italic font-display">Valor Sugerido</p>
              </div>
            </motion.div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <Package className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhum item localizado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
