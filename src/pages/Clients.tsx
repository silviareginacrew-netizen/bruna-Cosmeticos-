import { useState, useEffect, FormEvent } from 'react';
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
import { Client } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Phone,
  MapPin,
  FileText,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    observations: ''
  });

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    
    const timeoutId = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    const q = query(collection(db, 'users', userId, 'clients'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(data);
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
      if (editingClient) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'clients', editingClient.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        alert('Cliente atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'clients'), {
          ...formData,
          totalDebt: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        alert('Cliente cadastrado com sucesso!');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser || !confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'clients', id));
      alert('Cliente excluído com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir cliente.');
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        address: client.address,
        observations: client.observations || ''
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        observations: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-semibold text-pink-gradient mb-1">Clientes</h1>
            <p className="text-white/40 text-sm italic font-light tracking-wide italic">Sua rede de influência.</p>
          </div>
          <button 
            onClick={() => openModal()} 
            className="w-14 h-14 bg-premium-pink text-white rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input 
          type="text" 
          placeholder="Nome ou telefone..."
          className="input-premium pl-12 h-14 bg-dark-surface"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-premium-pink" />
          <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Carregando clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
              <Users className="w-12 h-12 text-white/5" />
              <p className="text-white/20 font-display text-xl uppercase tracking-widest italic">Acervo vazio</p>
            </div>
          ) : (
            filteredClients.map((c) => (
              <motion.div 
                layout
                key={c.id} 
                className="card-premium group relative border-white/5 hover:border-premium-pink/40 transition-all duration-500 flex flex-col overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-premium-pink/20 to-transparent flex items-center justify-center text-premium-pink font-display font-bold text-3xl border border-premium-pink/10 shadow-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(c)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-premium-pink hover:text-black transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="w-10 h-10 flex items-center justify-center bg-red-400/5 text-red-400 border border-red-400/5 rounded-xl hover:bg-red-400/20 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-display text-2xl text-white group-hover:text-premium-pink transition-colors mb-4">{c.name}</h3>

                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 text-sm text-white/30 group-hover:text-white/60 transition-colors">
                    <Phone className="w-4 h-4 text-premium-pink/40" />
                    <span className="font-medium tracking-wide">{c.phone || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/30 group-hover:text-white/60 transition-colors">
                    <MapPin className="w-4 h-4 text-premium-pink/40" />
                    <span className="line-clamp-1 italic">{c.address || 'Sem endereço'}</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-white/20 block mb-1">Dívida Ativa</span>
                    <p className={cn("font-display text-xl", (c.totalDebt || 0) > 0 ? "text-red-400" : "text-green-400")}>
                      R$ {(c.totalDebt || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleWhatsApp(c.phone)}
                    className="w-14 h-14 bg-green-500/10 text-green-500 border border-green-500/10 rounded-2xl flex items-center justify-center hover:bg-green-500 hover:text-black transition-all shadow-xl"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </button>
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
              className="bg-dark-surface w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-white/10"
            >
              <button onClick={closeModal} className="absolute top-6 right-6 text-white/40 hover:text-white">
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-gold-gradient">
                {editingClient ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 mb-2 block">Nome</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Telefone (WhatsApp)</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Endereço</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-2 block">Observações</label>
                  <textarea 
                    className="input-premium min-h-[100px] resize-none" 
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="btn-premium w-full flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente')}
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
