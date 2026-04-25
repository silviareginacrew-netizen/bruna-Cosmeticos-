import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Brand } from '../types';
import Logo from '../components/ui/Logo';
import { 
  Search, 
  MessageCircle, 
  Package, 
  Filter, 
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Catalog() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState<Brand | 'Todas'>('Todas');
  const [businessName, setBusinessName] = useState('Bruna Cosméticos');

  useEffect(() => {
    // 1. Find user by slug (In a real app, you'd index slugs. 
    // For this prototype, let's look for any user since the prompt says "Bruna")
    const findProducts = async () => {
      try {
        // We'll search across all 'inventory' collections via collectionGroup? 
        // No, we need the specific userId. Let's assume we find the userId from the slug.
        // For demonstration, we'll try to find a user where businessName matches or is related.
        // But simpler: let's use a hardcoded search for the 'bruna-catalogo' first user found or similar.
        
        // BETTER: The user would share a link like /app/USER_ID
        // But for the requested look, let's try to find based on slug.
        const usersRef = collection(db, 'users');
        // Let's assume the businessSlug is actually the userId for this MVP
        // OR we search for a user with that slug
        
        // For now, let's just use the userId if the slug looks like one, or try to find it.
        let userId = businessSlug;
        
        if (userId) {
          const unsub = onSnapshot(collection(db, 'users', userId, 'inventory'), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(data);
            setLoading(false);
          }, (err) => {
            console.error(err);
            setError('Catálogo não encontrado ou inacessível.');
            setLoading(false);
          });
          return () => unsub();
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar catálogo.');
        setLoading(false);
      }
    };

    findProducts();
  }, [businessSlug]);

  const handleWhatsApp = (product: Product) => {
    const text = encodeURIComponent(
      `Olá! Vi o produto *${product.name}* no seu catálogo online e gostaria de saber mais sobre ele.\n\nPreço: R$ ${product.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    );
    // Ideally we would get the business phone from the User profile
    const businessPhone = '5511999999999'; // Placeholder
    window.open(`https://wa.me/${businessPhone}?text=${text}`, '_blank');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = filterBrand === 'Todas' || p.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Logo size="lg" className="mb-8" />
        <p className="text-red-400 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-premium">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Header */}
      <header className="relative bg-dark-surface border-b border-white/10 p-8 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-premium-pink/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <Logo size="lg" className="mb-6 z-10" />
        <h1 className="text-2xl font-bold font-display z-10 text-pink-gradient tracking-tight">Catálogo Exclusivo</h1>
        <p className="text-white/40 text-sm max-w-xs mt-2 z-10">Qualidade e beleza em cada detalhe. O Boticário & Mary Kay.</p>
      </header>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 p-4 ">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              placeholder="O que você está procurando?"
              className="input-premium pl-10 h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Todas', 'O Boticário', 'Mary Kay', 'Outros'].map((b) => (
              <button
                key={b}
                onClick={() => setFilterBrand(b as any)}
                className={cn(
                  "px-6 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap",
                  filterBrand === b ? "bg-premium-pink text-black" : "bg-white/5 text-white/60"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((p) => (
            <motion.div 
              layout
              key={p.id}
              className="group"
            >
              <div className="aspect-[3/4] bg-dark-surface rounded-2xl overflow-hidden mb-3 relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                    <Package className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border border-white/10">
                  {p.brand}
                </div>
              </div>
              <h3 className="font-semibold text-sm line-clamp-1 mb-1">{p.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-premium-pink font-bold">R$ {p.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <button 
                  onClick={() => handleWhatsApp(p)}
                  className="p-2 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500 hover:text-white transition-all shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-white/20 italic font-display">
            Nenhum produto disponível no momento.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 p-12 text-center text-white/20">
        <Logo size="sm" className="opacity-30 mb-4 grayscale" />
        <p className="text-xs">© 2026 {businessName}. Todos os direitos reservados.</p>
        <div className="flex justify-center gap-4 mt-6">
          <button className="text-xs hover:text-gold transition-colors">Termos de Uso</button>
          <span className="opacity-20">•</span>
          <button className="text-xs hover:text-gold transition-colors">Privacidade</button>
        </div>
      </footer>
    </div>
  );
}
