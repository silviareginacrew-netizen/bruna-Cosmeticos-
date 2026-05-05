import React, { useState, useEffect, FormEvent } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Product, Brand } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  AlertTriangle,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';

export default function Inventory() {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState<Brand | 'Todas'>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'O Boticário' as Brand,
    category: '',
    code: '',
    buyPrice: 0,
    sellPrice: 0,
    quantity: 0,
    minQuantity: 5,
    observations: ''
  });

  useEffect(() => {
    if (location.pathname === '/adicionar-produto') {
      openModal();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    const q = query(collection(db, 'users', userId, 'inventory'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
      clearTimeout(timeoutId);
    }, (err) => {
      console.error(err);
      setLoading(false);
      clearTimeout(timeoutId);
    });
    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, [auth.currentUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) throw new Error('Nome do produto é obrigatório');
      if (formData.sellPrice <= 0) throw new Error('O preço de venda deve ser maior que zero');
      if (formData.quantity < 0) throw new Error('A quantidade não pode ser negativa');

      const dataToSave = {
        ...formData,
        buyPrice: Number(formData.buyPrice),
        sellPrice: Number(formData.sellPrice),
        quantity: Number(formData.quantity),
        minQuantity: Number(formData.minQuantity),
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'inventory', editingProduct.id), dataToSave);
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'inventory'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStock = async (id: string, currentQty: number, delta: number) => {
    if (!auth.currentUser) return;
    const newQty = currentQty + delta;
    if (newQty < 0) return;

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'inventory', id), {
        quantity: newQty,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'inventory', id));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir produto.');
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        brand: product.brand,
        category: product.category,
        code: product.code,
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
        observations: product.observations || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        brand: 'O Boticário',
        category: '',
        code: '',
        buyPrice: 0,
        sellPrice: 0,
        quantity: 0,
        minQuantity: 5,
        observations: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesBrand = filterBrand === 'Todas' || p.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-white/40 text-sm">Controle de produtos e volumes</p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="w-12 h-12 bg-premium-pink text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['Todas', 'O Boticário', 'Mary Kay', 'Outros'].map((brand) => (
            <button
              key={brand}
              onClick={() => setFilterBrand(brand as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                filterBrand === brand 
                  ? "bg-premium-pink border-premium-pink text-white" 
                  : "bg-white/5 border-white/10 text-white/40"
              )}
            >
              {brand}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Pesquisar produto..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-premium-pink" />
          <p className="text-xs text-white/20 uppercase font-bold tracking-widest">Carregando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <Package className="w-12 h-12 text-white/5" />
              <p className="text-white/20 font-medium tracking-widest uppercase text-xs">Nenhum produto encontrado</p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <motion.div 
                layout
                key={p.id} 
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-white/60">
                        {p.brand}
                      </span>
                      {p.quantity <= p.minQuantity && (
                        <span className="flex items-center gap-1 text-[10px] font-black bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> BAIXO
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                    <p className="text-xs text-white/40">{p.category || 'Geral'} {p.code ? `• SKU: ${p.code}` : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(p)} className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[10px] text-white/30 uppercase font-black block mb-1">Venda</span>
                    <span className="text-lg font-bold text-premium-pink">R$ {p.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/30 uppercase font-black block mb-1">Custo</span>
                    <span className="text-lg font-medium text-white/60">R$ {p.buyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                   <div className="flex-1">
                      <span className="text-[10px] text-white/30 uppercase font-black block mb-1">Estoque Disponível</span>
                      <span className={cn("text-xl font-bold", p.quantity <= p.minQuantity ? "text-red-400" : "text-white")}>
                        {p.quantity} unidades
                      </span>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                        onClick={() => handleUpdateStock(p.id, p.quantity, -1)}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <ChevronDown className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => handleUpdateStock(p.id, p.quantity, 1)}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-premium-pink"
                      >
                        <ChevronUp className="w-6 h-6" />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                {editingProduct ? <Edit2 className="w-5 h-5 text-premium-pink" /> : <Plus className="w-5 h-5 text-premium-pink" />}
                {editingProduct ? 'Editar' : 'Novo'} Produto
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Nome do Produto</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Marca</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white appearance-none"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value as Brand})}
                    >
                      <option value="O Boticário">O Boticário</option>
                      <option value="Mary Kay">Mary Kay</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Categoria</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
                      placeholder="Ex: Perfume" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Preço de Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({...formData, buyPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Preço de Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white text-premium-pink font-bold"
                    required 
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Quantidade Inicial</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
                      required 
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-black mb-1.5 block">Alerta de Estoque</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-premium-pink/50 transition-all text-white"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-premium-pink text-white font-bold py-4 rounded-xl mt-6 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
