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
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('O Boticário');
  const [businessName, setBusinessName] = useState('Bruna Cosméticos');
  const isAdmin = auth.currentUser?.uid === businessSlug;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      if (tabParam === 'boticario') setActiveTab('O Boticário');
      if (tabParam === 'marykay') setActiveTab('Mary Kay');
    }
  }, [location]);

  useEffect(() => {
    let userId = businessSlug;
    if (!userId) return;

    setLoading(true);
    setError(null);

    // Fetch business profile
    getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.businessName) setBusinessName(data.businessName);
      }
    });

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        if (products.length === 0) {
           setError('O tempo de carregamento expirou. Verifique sua conexão.');
        }
      }
    }, 8000);

    const inventoryRef = collection(db, 'users', userId, 'inventory');
    let q = query(inventoryRef);

    if (activeTab === 'Novidades') {
      q = query(inventoryRef, orderBy('createdAt', 'desc'), limit(24));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(pData);
      setLoading(false);
      clearTimeout(timeoutId);
    }, (err) => {
      console.error(err);
      setError('Erro ao carregar catálogo.');
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [businessSlug, activeTab]);

  const handleWhatsApp = (product: Product) => {
    const text = encodeURIComponent(
      `Olá Bruna! 👋 Gostaria de comprar o produto: *${product.name}*`
    );
    const businessPhone = '5511999999999'; // Placeholder
    window.open(`https://wa.me/${businessPhone}?text=${text}`, '_blank');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    
    // Normalized brand check to handle case variations
    const productBrand = p.brand?.toLowerCase().trim();
    
    // Tab logic
    if (activeTab === 'O Boticário') return matchesSearch && productBrand === 'o boticário';
    if (activeTab === 'Mary Kay') return matchesSearch && productBrand === 'mary kay';
    if (activeTab === 'Promoções') return matchesSearch && (p.observations?.toLowerCase().includes('promoção') || p.sellPrice < (p.buyPrice * 1.3));
    if (activeTab === 'Novidades') return matchesSearch;
    if (activeTab === 'Mais Vendidos') return matchesSearch && p.quantity < 3; // Heuristic
    
    return matchesSearch;
  });

  const getOptimizedUrl = (url: string) => {
    if (!url.includes('ik.imagekit.io')) return url;
    // Add transformation for product cards (medium quality, webp, responsive width)
    return `${url}?tr=w-600,q-80,f-auto`;
  };

  const tabs = [
    { id: 'Promoções', icon: Stars, label: 'Promoções' },
    { id: 'O Boticário', icon: Sparkles, label: 'O Boticário' },
    { id: 'Mary Kay', icon: Sparkles, label: 'Mary Kay' },
    { id: 'Novidades', icon: Clock, label: 'Novidades' },
    { id: 'Mais Vendidos', icon: Flame, label: 'Mais Vendidos' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-premium-pink mx-auto opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-premium-pink">BC</span>
            </div>
          </div>
          <p className="text-[10px] uppercase font-black tracking-[0.6em] text-white/20">Elite Experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Premium Hero Banner */}
      <header className="relative h-72 sm:h-96 flex flex-col items-center justify-center text-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=1500" 
            alt="Beauty Banner" 
            className="w-full h-full object-cover animate-pulse"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-20 space-y-6"
        >
          <Logo size="lg" className="mx-auto" />
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl font-display font-bold text-pink-gradient italic tracking-tighter">{businessName}</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/30">Onde a beleza encontra o luxo</p>
          </div>
        </motion.div>
      </header>

      {/* Luxury Tabs Menu */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-3xl border-b border-white/5 overflow-x-auto scrollbar-hide py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-2xl transition-all duration-700 whitespace-nowrap border group",
                activeTab === tab.id 
                  ? "bg-premium-pink border-premium-pink text-black shadow-2xl shadow-premium-pink/20" 
                  : "bg-white/[0.02] border-white/5 text-white/40 hover:border-white/20"
              )}
            >
              <tab.icon className={cn("w-4 h-4 transition-all duration-500", activeTab === tab.id ? "rotate-12" : "text-premium-pink group-hover:scale-125")} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-12 space-y-12">
        {/* Search */}
        <div className="relative max-w-3xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
          <input 
            type="text" 
            placeholder="O que desperta seu interesse?"
            className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 text-sm font-medium focus:border-premium-pink/40 transition-all outline-none italic"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error ? (
          <div className="py-40 text-center space-y-6">
            <AlertCircle className="w-20 h-20 mx-auto text-red-500/40" />
            <div className="space-y-2">
              <p className="text-2xl font-display uppercase tracking-widest text-red-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-premium-pink hover:text-black transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 && !loading ? (
          <div className="py-40 text-center opacity-20">
            <Package className="w-20 h-20 mx-auto mb-6" />
            <p className="text-3xl font-display uppercase tracking-widest italic">Acervo indispónivel no momento</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10"
            >
              {filteredProducts.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="group flex flex-col"
                >
                  <div className="aspect-[3/4] bg-dark-surface rounded-[2.5rem] overflow-hidden mb-6 relative border border-white/5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    {p.imageUrl ? (
                      <img 
                        src={getOptimizedUrl(p.imageUrl)} 
                        alt={p.name} 
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-5">
                        <Package className="w-24 h-24" />
                      </div>
                    )}

                    {/* Top Badge */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                      <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/40">
                        {p.brand}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate('/estoque')}
                            className="w-10 h-10 bg-premium-pink/80 backdrop-blur-md rounded-xl flex items-center justify-center text-black shadow-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => navigate('/estoque')}
                            className="w-10 h-10 bg-red-500/80 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Floating Action Button - Mobile focus */}
                    <div className="absolute bottom-6 right-6">
                      <button 
                        onClick={() => handleWhatsApp(p)}
                        className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-premium-pink hover:text-black transition-all shadow-xl group/btn"
                      >
                        <MessageCircle className="w-7 h-7 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 px-2">
                    <div className="space-y-1">
                      <h3 className="font-display text-2xl text-white group-hover:text-premium-pink transition-colors line-clamp-1 italic">{p.name}</h3>
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/10">{p.category || 'Luxury Collection'}</p>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/20">Investimento</span>
                        <p className="text-3xl font-display text-white">R$ {p.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      {p.quantity < 3 && p.quantity > 0 && (
                        <div className="flex items-center gap-1.5 text-orange-400/60 pb-1">
                          <Flame className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Últimas Unidades</span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => handleWhatsApp(p)}
                      className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-premium-pink hover:text-black transition-all group/buy"
                    >
                      Garanta o seu agora
                      <ArrowRight className="w-4 h-4 transition-transform group-hover/buy:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {isAdmin && (
        <button 
          onClick={() => navigate('/estoque')}
          className="fixed bottom-10 right-10 w-20 h-20 bg-premium-pink rounded-full flex items-center justify-center text-black shadow-[0_20px_50px_rgba(212,175,55,0.3)] z-[60] hover:scale-110 active:scale-95 transition-all group"
        >
          <Plus className="w-10 h-10 transition-transform group-hover:rotate-90" />
        </button>
      )}

      {/* Signature Footer */}
      <footer className="mt-40 border-t border-white/5 pt-20 pb-40 px-8 text-center space-y-12">
        <Logo size="lg" className="mx-auto opacity-10" />
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20">Bruna Cosméticos • Experience Luxury</p>
          <div className="flex items-center justify-center gap-4 text-white/10 text-[8px] uppercase font-black tracking-widest">
            <span>O Boticário</span>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <span>Mary Kay</span>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <span>Exclusive Care</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
