import { useState } from 'react';

/* ---------------------------------------------------------------------------
   Imagem com fallback desenhado. Se a URL falhar (offline, 404, CDN fora),
   em vez de um retângulo quebrado aparece um placeholder de marca: gradiente
   de profundidade + monograma vazado. O site nunca exibe estado "quebrado".
--------------------------------------------------------------------------- */

export default function SmartImage({
  src,
  alt,
  label,
  className = '',
  imgClassName = '',
}: {
  src?: string;
  alt: string;
  /** Texto do monograma do fallback (1ª letra). Default: alt. */
  label?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  const monogram = (label ?? alt ?? 'R').trim().charAt(0).toUpperCase() || 'R';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Fallback sempre presente por baixo — evita flash enquanto a imagem carrega */}
      <div aria-hidden className="absolute inset-0 card-grad grid place-items-center select-none">
        <span className="font-display text-6xl md:text-7xl text-outline">{monogram}</span>
        <span className="absolute bottom-2.5 right-3.5 font-mono text-[10px] tracking-widest text-fog/40">
          ROMPER<span className="text-volt/40">.</span>
        </span>
      </div>
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
}
