import { PRODUCTS } from './catalog';
import type { Question } from './types';

/* Perguntas & Respostas do produto (localStorage) até a tabela `questions`
   no Supabase — mesmo padrão mock-first de orders.ts. Comprador pergunta na
   página do produto; o vendedor responde pelo painel. */

const KEY = 'romper.questions.v1';

const SEED: Question[] = [
  {
    id: 'seed-q1',
    productId: 'p-organizador-modular',
    authorName: 'Renata S.',
    body: 'Dá pra empilhar os módulos com segurança?',
    createdAt: '2026-05-15T10:00:00.000Z',
    answer: { body: 'Dá sim! Os encaixes travam entre si — recomendamos até 3 níveis.', at: '2026-05-15T14:30:00.000Z' },
  },
  {
    id: 'seed-q2',
    productId: 'p-organizador-modular',
    authorName: 'Paulo H.',
    body: 'Qual a medida de cada módulo?',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
];

function readLocal(): Question[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Question[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Question[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Respostas dadas às perguntas do SEED ficam num mapa separado. */
const ANSWERS_KEY = 'romper.questionAnswers.v1';

function readSeedAnswers(): Record<string, { body: string; at: string }> {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function merged(): Question[] {
  const seedAnswers = readSeedAnswers();
  const seed = SEED.map((q) => (seedAnswers[q.id] ? { ...q, answer: seedAnswers[q.id] } : q));
  return [...seed, ...readLocal()];
}

export function listQuestions(productId: string): Question[] {
  return merged()
    .filter((q) => q.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function askQuestion(productId: string, authorName: string, body: string): Question {
  const q: Question = {
    id: `q-${Date.now().toString(36)}`,
    productId,
    authorName,
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };
  writeLocal([...readLocal(), q]);
  return q;
}

export function answerQuestion(questionId: string, body: string): void {
  const answer = { body: body.trim(), at: new Date().toISOString() };
  const locals = readLocal();
  const q = locals.find((x) => x.id === questionId);
  if (q) {
    q.answer = answer;
    writeLocal(locals);
    return;
  }
  if (SEED.some((s) => s.id === questionId)) {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...readSeedAnswers(), [questionId]: answer }));
  }
}

/** Perguntas (não respondidas primeiro) dos produtos de uma loja do catálogo. */
export function listQuestionsForSeller(storeSlug: string): Array<Question & { productTitle: string }> {
  const mine = new Map(PRODUCTS.filter((p) => p.seller.slug === storeSlug).map((p) => [p.id, p.title]));
  return merged()
    .filter((q) => mine.has(q.productId))
    .map((q) => ({ ...q, productTitle: mine.get(q.productId)! }))
    .sort((a, b) => Number(!!a.answer) - Number(!!b.answer) || b.createdAt.localeCompare(a.createdAt));
}
