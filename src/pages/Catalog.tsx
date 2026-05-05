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
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-4xl font-bold text-white mb-1">Catálogo</h1>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-[0.2em]">Consulta rápida de produtos</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input 
          type="text" 
          placeholder="Pesquisar no catálogo..."
          className="input-premium pl-12 h-14"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Todos', 'O Boticário', 'Mary Kay'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all",
              activeTab === tab ? "bg-premium-pink text-black" : "bg-white/5 text-white/40"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-premium-pink" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map(p => (
            <div key={p.id} className="p-5 bg-white/[0.03] border border-white/5 rounded-3xl flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-black text-premium-pink/60 tracking-widest mb-1">{p.brand}</p>
                <h3 className="text-white font-bold text-lg">{p.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                    p.quantity > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {p.quantity > 0 ? 'Disponível' : 'Esgotado'}
                  </span>
                  <span className="text-white/20 text-[9px] uppercase font-black tracking-tighter">{p.quantity} un. em estoque</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatCurrency(p.sellPrice)}</p>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <p className="font-display uppercase tracking-widest">Nenhum item encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
