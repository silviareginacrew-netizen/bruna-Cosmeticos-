import { useState, FormEvent } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Logo from '../components/ui/Logo';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayConnected, setStayConnected] = useState(true);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (stayConnected) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }

      if (isForgot) {
        await sendPasswordResetEmail(auth, email);
        setSuccess('E-mail de recuperação enviado!');
        setIsForgot(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Initialize user profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          businessName: `Bruna Cosméticos`,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.includes('auth/user-not-found') ? 'Usuário não encontrado.' : 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-premium-pink/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-premium-gold/3 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full max-w-sm z-10"
      >
        <div className="text-center mb-16 space-y-6">
          <Logo size="lg" className="mx-auto transform transition-transform hover:scale-105 duration-700" />
          <p className="text-[9px] uppercase font-black tracking-[0.6em] text-white/20 animate-pulse">Beleza que valoriza você</p>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-display font-medium text-white mb-2 tracking-tight italic">
              {isForgot ? 'Recuperar Acesso' : isLogin ? 'Boas-vindas' : 'Junte-se a nós'}
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/10">
              {isLogin ? 'Representante Exclusiva' : 'Comece seu legado na beleza'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && !isForgot && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <input
                      type="text"
                      className="input-premium pl-5"
                      placeholder="Nome Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <input
                type="email"
                className="input-premium pl-5"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isForgot && (
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-premium pl-5 pr-12"
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-premium-pink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between px-1">
                    <button 
                      type="button"
                      onClick={() => setStayConnected(!stayConnected)}
                      className="flex items-center gap-3 group"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-700",
                        stayConnected ? "bg-premium-pink border-premium-pink" : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
                      )}>
                        {stayConnected && <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />}
                      </div>
                      <span className="text-[9px] font-black text-white/20 group-hover:text-white/40 tracking-widest transition-colors uppercase">Manter Conectado</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-400 text-[10px] text-center font-bold uppercase tracking-widest leading-relaxed">
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-green-400 text-[10px] text-center font-bold uppercase tracking-widest leading-relaxed">
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-5 flex items-center justify-center gap-3 group relative mt-4 shadow-2xl shadow-premium-pink/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.3em] font-black text-[10px]">{isForgot ? 'Recuperar' : isLogin ? 'Acessar' : 'Entrar na Elite'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-700 group-hover:translate-x-1.5" />
                </>
              )}
            </button>
          </form>

          <div className="flex flex-col items-center gap-6 pt-4">
            {!isForgot && (
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-[9px] text-white/30 hover:text-premium-pink tracking-[0.3em] transition-all font-black uppercase flex items-center gap-2 group"
              >
                <div className="w-8 h-[1px] bg-white/5 group-hover:bg-premium-pink/40 transition-colors" />
                {isLogin ? 'Criar Nova Conta' : 'Voltar ao Login'}
                <div className="w-8 h-[1px] bg-white/5 group-hover:bg-premium-pink/40 transition-colors" />
              </button>
            )}
            
            <button 
              onClick={() => {
                setIsForgot(!isForgot);
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className="text-[8px] uppercase tracking-[0.4em] text-white/10 hover:text-white/20 transition-all font-bold italic"
            >
              {isForgot ? 'Cancelar Recuperação' : 'Esqueci minhas credenciais'}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Visual Signature */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-5 pointer-events-none">
        <Logo size="sm" />
      </div>
    </div>
  );
}
