import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

/** Revela o conteúdo ao entrar na viewport. Respeita prefers-reduced-motion.
 *  Passe `className` quando o Reveal for filho direto de um grid/flex e
 *  precisar repassar classes de layout (col-span, row-span...) — elas têm
 *  que ir no elemento que o grid enxerga como item, ou seja, este wrapper. */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
