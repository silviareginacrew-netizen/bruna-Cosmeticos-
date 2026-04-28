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
          businessName: `${name} Cosméticos`,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message === 'Firebase: Error (auth/user-not-found).' ? 'Usuário não encontrado.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-premium-pink/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-premium-pink/2 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <Logo size="lg" className="mb-14" />

        <div className="card-premium bg-white/[0.02] border-white/5 p-8 shadow-2xl">
          <h2 className="text-3xl font-display font-medium mb-8 text-center text-pink-gradient italic">
            {isForgot ? 'Recuperar Acesso' : isLogin ? 'Bem-vinda de volta' : 'Crie seu Acervo'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && !isForgot && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 ml-1 mb-2 block font-bold">Titular</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-premium pl-12"
                      placeholder="Qual seu nome completo?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <ArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-pink/40" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 ml-1 mb-2 block font-bold">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  className="input-premium pl-12"
                  placeholder="Seu e-mail profissional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-pink/40" />
              </div>
            </div>

            {!isForgot && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-white/30 ml-1 mb-2 block font-bold">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input-premium pl-12 pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-pink/40" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-premium-pink transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => setStayConnected(!stayConnected)}
                    className="flex items-center gap-3 group ml-1"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-500",
                      stayConnected ? "bg-premium-pink border-premium-pink" : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
                    )}>
                      {stayConnected && <Check className="w-3 h-3 text-black stroke-[4px]" />}
                    </div>
                    <span className="text-[11px] font-bold text-white/40 group-hover:text-white/60 tracking-wider transition-colors uppercase">Manter conectado</span>
                  </button>
                )}
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs text-center font-medium">
                {success}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full mt-8 py-5 flex items-center justify-center gap-3 overflow-hidden group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] font-bold text-xs">{isForgot ? 'Enviar Link' : isLogin ? 'Acessar Painel' : 'Finalizar Cadastro'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            {!isForgot && (
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-premium-pink/60 hover:text-premium-pink tracking-widest transition-all font-bold uppercase"
              >
                {isLogin ? 'CRIAR CONTA' : 'ENtrar agora'}
              </button>
            )}
            <button 
              onClick={() => {
                setIsForgot(!isForgot);
                setIsLogin(true);
              }}
              className="text-[9px] uppercase tracking-[0.3em] text-white/20 hover:text-white/40 transition-all font-bold"
            >
              {isForgot ? 'VOLTAR PARA LOGIN' : 'ESQUECI MEU ACESSO'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
