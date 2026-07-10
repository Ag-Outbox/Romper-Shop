/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Romper Shop design tokens ----
        ink: '#0A0A0B',        // fundo base (quase preto, leve azulado)
        surface: '#141416',    // cards / seções
        line: '#26262A',       // hairlines / bordas
        fog: '#8A8A94',        // texto secundário
        mist: '#E8E8EC',       // texto primário sobre escuro
        volt: '#CCFF00',       // COR DE ASSINATURA — verde-limão elétrico
        'volt-dim': '#A8D400', // volt para hovers/estados
        ember: '#FF5A3C',      // acento secundário (promoções/COD)
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
        volt: '0 0 50px -12px rgba(204, 255, 0, 0.45)',
        lift: '0 24px 48px -24px rgba(0, 0, 0, 0.7)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
