/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Romper Shop design tokens (tema claro / página de vendas) ----
        // Os NOMES são papéis, não cores: ink = fundo base, mist = texto
        // primário. Trocar o tema inteiro = trocar só estes valores.
        ink: '#F4F3EE',        // fundo base (marfim quente — claro sem estourar)
        surface: '#FFFFFF',    // cards / seções (branco puro salta do marfim)
        line: '#E0DFD6',       // hairlines / bordas (quentes)
        fog: '#6E6D64',        // texto secundário
        mist: '#161613',       // texto primário sobre claro (também fundo invertido)
        volt: '#5C940B',       // COR DE ASSINATURA — verde-limão legível no marfim
        'volt-dim': '#47730A', // volt para hovers/estados
        ember: '#E23A20',      // acento secundário (promoções/COD)
      },
      fontFamily: {
        // display marcante + corpo legível + mono utilitário.
        // Space Grotesk (auto-hospedada) segura o display se a CDN da Clash falhar.
        display: ['"Clash Display"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(3rem, 12vw, 12rem)', { lineHeight: '0.88', letterSpacing: '-0.03em' }],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        volt: '0 0 40px -10px rgba(92, 148, 11, 0.35)',
        lift: '0 24px 48px -24px rgba(28, 28, 18, 0.22)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
