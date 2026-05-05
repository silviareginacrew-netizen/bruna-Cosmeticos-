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
import { motion, AnimatePresence } from 'framer-motion';
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

    try {
      const q = query(collection(db, 'users', userId, 'clients'));
      const unsub = onSnapshot(q, (snap) => {
        console.log("Clients Snap:", snap.size);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
        setLoading(false);
        clearTimeout(timeoutId);
      }, (err) => {
        console.error("Erro Clients Listener:", err);
        setLoading(false);
        clearTimeout(timeoutId);
      });
      return () => {
        unsub();
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Erro setup Clients:", error);
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }, [auth.currentUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) throw new Error('Nome é obrigatório');
      if (!formData.phone.trim()) throw new Error('Telefone é obrigatório');

      if (editingClient) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'clients', editingClient.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        // Success feedback already provided by UI changes below
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'clients'), {
          ...formData,
          totalDebt: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar cliente.');
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
    <div className="space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-white italic">Clientes</h1>
          <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.3em] mt-1">Gestão de Relacionamento</p>
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

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-premium-pink transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar no mailing..."
          className="input-premium pl-12"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-12 h-12 border-2 border-premium-pink/10 border-t-premium-pink rounded-full animate-spin" />
          <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.4em]">Sincronizando contatos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredClients.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-6 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem]">
              <Users className="w-16 h-16 text-white/[0.02]" />
              <p className="text-white/10 font-black tracking-widest uppercase text-[10px]">Nenhum cliente localizado</p>
            </div>
          ) : (
            filteredClients.map((c, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={c.id} 
                className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-6 group hover:translate-y-[-4px] transition-all duration-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-premium-pink/20 to-transparent flex items-center justify-center text-premium-pink font-display font-bold text-3xl border border-premium-pink/10 shadow-lg">
                      {c.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display text-2xl font-medium text-white italic group-hover:text-premium-pink transition-colors">{c.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/20 tracking-widest">
                          <Phone className="w-3 h-3 text-premium-pink/40" /> {c.phone || 'Sem contato'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(c)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/20 hover:text-white rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/20 hover:text-red-500 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-white/10 shrink-0" />
                  <p className="text-xs text-white/40 italic truncate">{c.address || 'Residência não cadastrada'}</p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-white/20 block mb-1 font-black">Pendência Financeira</span>
                    <p className={cn("text-xl font-bold tracking-tighter", (c.totalDebt || 0) > 0 ? "text-red-500" : "text-green-500")}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.totalDebt || 0)}
                    </p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleWhatsApp(c.phone)}
                    className="w-14 h-14 bg-green-500/10 text-green-500 border border-green-500/10 rounded-[1.2rem] flex items-center justify-center hover:bg-green-500 hover:text-black transition-all shadow-xl shadow-green-500/10"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </motion.button>
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
              <button onClick={closeModal} className="absolute top-8 right-8 text-white/20 hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>

              <div className="mb-10">
                <h2 className="text-3xl font-display font-medium text-white italic">
                  {editingClient ? 'Ajustar' : 'Novo'} Perfil
                </h2>
                <p className="text-[9px] uppercase font-black tracking-widest text-premium-pink mt-1">Excelência no Atendimento</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="Identificação da Cliente"
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Contato Concierge (WhatsApp)</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="(00) 00000-0000"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Localização</label>
                  <input 
                    type="text" 
                    className="input-premium" 
                    placeholder="Endereço de Entrega"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] text-white/20 uppercase font-black tracking-widest ml-1">Observações Privadas</label>
                  <textarea 
                    className="input-premium min-h-[120px] resize-none pt-4" 
                    placeholder="Preferências, datas especiais..."
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting} className="btn-premium w-full !py-6 shadow-2xl shadow-premium-pink/20">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingClient ? 'Salvar Perfil' : 'Integrar à Base Elite')}
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
