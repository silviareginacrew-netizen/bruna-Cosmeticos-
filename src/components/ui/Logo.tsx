import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-7xl',
    xl: 'text-9xl',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center font-display select-none group", className)}>
      <div className={cn("relative flex items-center justify-center tracking-tighter", sizeClasses[size])}>
        <motion.span 
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          className="text-white font-light italic opacity-90"
        >
          B
        </motion.span>
        <motion.span 
          initial={{ x: -2, y: 8 }}
          animate={{ x: -2, y: 10 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'mirror' }}
          className="text-premium-pink font-bold italic -ml-2"
        >
          C
        </motion.span>
        <div className="absolute -inset-4 bg-premium-pink/5 blur-2xl rounded-full -z-10 group-hover:bg-premium-pink/10 transition-colors duration-1000" />
      </div>
      <div className="text-[0.45em] tracking-[0.6em] uppercase text-white/20 mt-4 font-sans font-black whitespace-nowrap">
        Curadoria de Luxo
      </div>
    </div>
  );
}
