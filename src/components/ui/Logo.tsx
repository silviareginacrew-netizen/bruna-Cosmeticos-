import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center font-display select-none", className)}>
      <div className={cn("relative flex items-center justify-center tracking-tighter", sizeClasses[size])}>
        <span className="text-white font-light italic opacity-90">B</span>
        <span className="text-premium-pink font-bold italic -ml-2 translate-y-2">C</span>
        <div className="absolute -inset-2 bg-premium-pink/5 blur-xl rounded-full -z-10" />
      </div>
      <div className="text-[0.55em] tracking-[0.5em] uppercase text-white/40 mt-3 font-sans font-light whitespace-nowrap">
        Bruna Cosméticos
      </div>
    </div>
  );
}
