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
    <div className="space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-white italic">Estoque</h1>
          <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Gestão de Acervo Elite</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openModal()} 
          className="w-14 h-14 bg-premium-pink text-white rounded-full flex items-center justify-center shadow-xl shadow-premium-pink/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {['Todas', 'O Boticário', 'Mary Kay', 'Outros'].map((brand) => (
            <button
              key={brand}
              onClick={() => setFilterBrand(brand as any)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap border",
                filterBrand === brand 
                  ? "bg-premium-pink border-premium-pink text-white shadow-lg shadow-premium-pink/20" 
                  : "bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40"
              )}
            >
              {brand}
            </button>
          ))}
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-premium-pink transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar no acervo..."
            className="input-premium pl-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando acervo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <Package className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhum item localizado</p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <motion.div 
                layout
                key={p.id} 
                className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-6 group hover:translate-y-[-4px] transition-all duration-500"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black bg-white/5 px-2 py-1 rounded text-white/30 uppercase tracking-widest">
                        {p.brand}
                      </span>
                      {p.quantity <= p.minQuantity && (
                        <span className="flex items-center gap-1 text-[8px] font-black bg-red-500/10 text-red-500 px-2 py-1 rounded uppercase tracking-widest">
                          <AlertTriangle className="w-3 h-3" /> Reposição
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-medium text-white italic group-hover:text-premium-pink transition-colors">{p.name}</h3>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{p.category || 'Geral'} {p.code ? `• SKU: ${p.code}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(p)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-white/20 hover:text-white transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/10 rounded-xl text-white/20 hover:text-red-500 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <span className="text-[9px] text-white/20 uppercase font-black block mb-1 tracking-widest">Venda</span>
                    <span className="text-xl font-bold text-premium-pink"> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.sellPrice)}</span>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                    <span className="text-[9px] text-white/20 uppercase font-black block mb-1 tracking-widest">Custo</span>
                    <span className="text-xl font-medium text-white/40"> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.buyPrice)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                   <div>
                      <span className="text-[9px] text-white/20 uppercase font-black block mb-1 tracking-widest">Saldo Atual</span>
                      <span className={cn("text-2xl font-bold tracking-tighter", p.quantity <= p.minQuantity ? "text-red-500" : "text-white")}>
                        {p.quantity} <span className="text-[10px] uppercase font-black tracking-widest ml-1 opacity-20">unidades</span>
                      </span>
                   </div>
                   <div className="flex items-center gap-3">
                     <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateStock(p.id, p.quantity, -1)}
                        className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all"
                      >
                        <ChevronDown className="w-6 h-6 text-white/20" />
                      </motion.button>
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleUpdateStock(p.id, p.quantity, 1)}
                        className="w-12 h-12 flex items-center justify-center bg-premium-pink/10 border border-premium-pink/20 rounded-2xl hover:bg-premium-pink/20 transition-all text-premium-pink"
                      >
                        <ChevronUp className="w-6 h-6" />
                      </motion.button>
                   </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modern Modal Design */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-dark-bg/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              className="bg-dark-surface w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <button 
                onClick={closeModal}
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-10">
                <h2 className="text-2xl font-display font-medium text-white italic">
                  {editingProduct ? 'Ajustar' : 'Novo'} Item
                </h2>
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Exclusividade no seu Acervo</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Identificação</label>
                  <input 
                    type="text" 
                    className="input-premium"
                    placeholder="Nome do Produto de Luxo"
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Assinatura</label>
                    <select 
                      className="input-premium appearance-none"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value as Brand})}
                    >
                      <option value="O Boticário">O Boticário</option>
                      <option value="Mary Kay">Mary Kay</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Categoria</label>
                    <input 
                      type="text" 
                      className="input-premium"
                      placeholder="Ex: Fragrância" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Custo Un.</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-premium"
                      placeholder="0,00"
                      value={formData.buyPrice || ''}
                      onChange={(e) => setFormData({...formData, buyPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Venda Sugerida</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input-premium font-bold text-premium-pink"
                      placeholder="0,00"
                      required 
                      value={formData.sellPrice || ''}
                      onChange={(e) => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Em Mãos</label>
                    <input 
                      type="number" 
                      className="input-premium"
                      placeholder="0"
                      required 
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Alerta Reserva</label>
                    <input 
                      type="number" 
                      className="input-premium"
                      placeholder="Ex: 5"
                      value={formData.minQuantity || ''}
                      onChange={(e) => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn-premium w-full !py-6 shadow-2xl shadow-premium-pink/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    editingProduct ? 'Confirmar Ajustes' : 'Integrar ao Acervo'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
