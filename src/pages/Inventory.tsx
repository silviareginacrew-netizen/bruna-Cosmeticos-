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
import { compressImage } from '../lib/imageUtils';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter,
  X,
  Camera,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    observations: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (location.pathname === '/adicionar-produto') {
      openModal();
    }
  }, [location.pathname]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string, 1000, 1000, 0.6);
          setFormData({ ...formData, imageUrl: compressed });
        } catch (err) {
          console.error('Erro na compressão:', err);
          setFormData({ ...formData, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
      if (editingProduct) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'inventory', editingProduct.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        alert('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'inventory'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        alert('Produto cadastrado com sucesso!');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'inventory', id));
      alert('Produto excluído com sucesso!');
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
        observations: product.observations || '',
        imageUrl: product.imageUrl || ''
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
        observations: '',
        imageUrl: ''
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
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1">Estoque</h1>
            <p className="text-white/40 text-sm italic font-light tracking-wide italic">Curadoria de luxo BC.</p>
          </div>
          <button 
            onClick={() => openModal()} 
            className="w-14 h-14 bg-premium-pink text-white rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* Brand Selectors Desktop/Mobile */}
      <div className="bg-dark-surface p-2 rounded-2xl border border-white/5 flex gap-2 overflow-x-auto scrollbar-hide">
        {['Todas', 'O Boticário', 'Mary Kay', 'Outros'].map((brand) => (
          <button
            key={brand}
            onClick={() => setFilterBrand(brand as any)}
            className={cn(
              "flex-1 px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap",
              filterBrand === brand ? "bg-premium-pink text-black" : "text-white/30 hover:bg-white/5 hover:text-white"
            )}
          >
            {brand}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input 
          type="text" 
          placeholder="Pesquisar produto ou referência..."
          className="input-premium pl-12 h-14 bg-dark-surface"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Carregando estoque...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
              <Package className="w-12 h-12 text-white/5" />
              <p className="text-white/20 font-display text-xl uppercase tracking-widest italic">Acervo vazio</p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <motion.div 
                layout
                key={p.id} 
                className="card-premium group relative border-white/5 hover:border-premium-pink/40 transition-all duration-500 overflow-hidden"
              >
                {p.quantity <= p.minQuantity && (
                  <div className="absolute top-0 right-0 p-3 bg-red-500/20 text-red-400 rounded-bl-2xl z-10">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                
                <div className="aspect-[4/5] bg-gradient-to-b from-white/5 to-transparent rounded-2xl mb-5 flex items-center justify-center overflow-hidden border border-white/5 relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <Package className="w-16 h-16 text-white/5" />
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] uppercase font-black tracking-[0.2em] border border-white/10">
                    {p.brand}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-xl text-white group-hover:text-premium-pink transition-colors truncate">{p.name}</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">{p.category || 'Cosméticos'}</p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-white/20 block mb-1">Preço Final</span>
                      <p className="font-display text-2xl text-white">R$ {p.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-widest text-white/20 block mb-1">Volumes</span>
                      <p className={cn("font-bold text-lg", p.quantity <= p.minQuantity ? "text-red-400" : "text-white/60")}>
                        {p.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
                    <button onClick={() => openModal(p)} className="flex-1 btn-outline py-3 text-[10px] uppercase tracking-widest px-0">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-12 h-12 flex items-center justify-center bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">
                      <Trash2 className="w-4 h-4" />
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
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-dark-surface w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={closeModal}
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                {editingProduct ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex flex-col items-center gap-4 py-4 bg-white/5 rounded-3xl border border-dashed border-white/10 group hover:border-premium-pink/40 transition-all cursor-pointer relative overflow-hidden">
                  {formData.imageUrl ? (
                    <div className="relative w-full aspect-video">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, imageUrl: ''})}
                        className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/60 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center gap-2">
                       <Camera className="w-10 h-10 text-white/20 group-hover:text-premium-pink transition-colors" />
                       <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Tirar foto ou Galeria</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/60 mb-2 block">Nome do Produto</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Marca</label>
                  <select 
                    className="input-premium"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value as Brand})}
                  >
                    <option value="O Boticário">O Boticário</option>
                    <option value="Mary Kay">Mary Kay</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Categoria</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="ex: Perfumaria, Maquiagem" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Código/SKU</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Preço de Compra (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-premium" 
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({...formData, buyPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Preço de Venda (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-premium" 
                    required 
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Quantidade em Estoque</label>
                  <input 
                    type="number" 
                    className="input-premium" 
                    required 
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Estoque Crítico (Alerta)</label>
                  <input 
                    type="number" 
                    className="input-premium" 
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/60 mb-2 block">Observações</label>
                  <textarea 
                    className="input-premium min-h-[100px] resize-none" 
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 mt-4">
                  <button type="submit" className="btn-premium w-full">
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
