# Romper Shop — Home page: brief de design e prompt para iterar

A home já está construída e **buildando** (`npm run build` passa limpo). Este
documento serve para você (ou o Claude Code no seu ambiente) refinarem a partir
de uma direção clara, sem virar um template genérico.

## Direção visual (o "cara" do site)

**Dark editorial + verde-limão elétrico de assinatura.** Foge dos dois clichês
de e-commerce (o laranja/azul padrão e o preto-genérico) ao ancorar tudo numa
única cor ousada usada com disciplina.

### Design tokens (em `tailwind.config.js`)

| Token | Hex | Uso |
|-------|-----|-----|
| `ink` | `#0A0A0B` | fundo base |
| `surface` | `#141416` | cards / seções |
| `line` | `#26262A` | hairlines / bordas |
| `fog` | `#8A8A94` | texto secundário |
| `mist` | `#E8E8EC` | texto primário |
| `volt` | `#CCFF00` | **cor de assinatura** (CTAs, destaques, ranking) |
| `ember` | `#FF5A3C` | acento secundário (promoções) |

**Tipografia:** Clash Display (display, com personalidade) + Inter (corpo) +
JetBrains Mono (labels/dados). Hero em `clamp(3rem, 12vw, 12rem)`.

## Estrutura da home (já implementada)

1. **Hero = tese** — "Um lugar. Tudo que você procura." Título gigante com
   parallax sutil no scroll, busca em destaque, faixa de stats. A cor volt
   aparece só no que importa (ponto do logo, "procura.", CTA).
2. **Marquee** — categorias rolando continuamente (pausa com reduced-motion).
3. **Grid de categorias** — assimétrico/editorial (spans diferentes), reveal
   escalonado, hover que acende em volt.
4. **Teaser do algoritmo** — mostra o ranking "em alta" por categoria (mock).
   É a vitrine do motor de recomendação (que ainda é stub no backend).
5. **Faixa COD** — bloco volt sólido, alto contraste: "Pague na entrega".
6. **CTA de vendedor** — abrir loja / importar dropship.
7. **Footer**.

## Motion (deliberado, não decorativo)

- Scroll suave via **Lenis** (`useSmoothScroll`), desligado em reduced-motion.
- Reveals no viewport via **Framer Motion** (`<Reveal>`).
- Parallax só no título do hero. Marquee contínuo. Nada de efeito gratuito.

## Prompt para colar no Claude Code (próximas iterações)

> Refine a home do Romper Shop mantendo os design tokens em tailwind.config.js
> (dark + volt #CCFF00). Objetivo: qualidade Awwwards. Faça, um de cada vez:
> 1. Trocar os blocos de categoria por cards com imagem real (Supabase Storage),
>    mantendo o grid assimétrico e o hover em volt.
> 2. Adicionar transições de página (View Transitions API) entre home e /produto.
> 3. Cursor customizado sutil (dot que cresce sobre elementos interativos),
>    respeitando reduced-motion e desativado em touch.
> 4. Ligar o teaser "em alta" à tabela product_scores quando o worker existir;
>    por ora manter mock.
> 5. Garantir Core Web Vitals verdes: lazy-load de imagens em AVIF/WebP,
>    fontes com font-display swap, sem layout shift.
> Antes de codar cada item, me mostre um screenshot do estado atual e o que muda.

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # valida tipos + bundle de produção
```

## Ligar ao Supabase

Crie `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, aplique as
migrations (`supabase db push`) e conecte os dados reais em categorias e no
teaser de ranking.
