import React from 'react';

interface SelcukLogoProps {
  className?: string;
  size?: number;
  variant?: 'color' | 'white' | 'gold' | 'badge';
  withText?: boolean;
  textClassName?: string;
}

export const SelcukLogo: React.FC<SelcukLogoProps> = ({ 
  className = '', 
  size = 48, 
  variant = 'color',
  withText = false,
  textClassName = ''
}) => {
  const isWhite = variant === 'white';
  const isBadge = variant === 'badge';

  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      <div 
        className={`relative flex items-center justify-center shrink-0 rounded-full transition overflow-hidden ${
          isBadge ? 'bg-white p-1 shadow-md border border-slate-200 ring-2 ring-[#c5a880]/40' : ''
        }`}
        style={{ width: size, height: size }}
      >
        <img
          src="/selcuk_emblem.svg"
          alt="Selçuk Üniversitesi Resmî Amblemi"
          width={size}
          height={size}
          className={`w-full h-full object-contain select-none transition ${
            isWhite ? 'brightness-0 invert drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]' : 'drop-shadow-sm'
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/selcuk_kapak_logo.png';
          }}
        />
      </div>

      {withText && (
        <div className={`flex flex-col leading-tight select-none ${textClassName}`}>
          <span className="font-black tracking-wider font-serif uppercase text-sm sm:text-base text-white">
            SELÇUK ÜNİVERSİTESİ
          </span>
          <span className="text-[11px] font-semibold text-[#c5a880] tracking-wider uppercase">
            Staj Bilgi Sistemi
          </span>
        </div>
      )}
    </div>
  );
};
