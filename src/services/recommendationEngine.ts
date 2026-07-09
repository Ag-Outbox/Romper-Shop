/**
 * =============================================================================
 * RECOMMENDATION ENGINE — STUB (NÃO IMPLEMENTADO)
 * =============================================================================
 * Objetivo: ranquear os produtos "mais recomendados" por categoria.
 *
 * Este arquivo define APENAS o contrato e a documentação do algoritmo.
 * Nenhuma lógica de ranqueamento está implementada — todas as funções são
 * `// TODO`. Um worker/cron no Coolify chamará `recomputeCategory()` e gravará
 * o resultado na tabela `product_scores`.
 *
 * FEATURES (sinais de entrada) — ver colunas em public.product_scores:
 *   conversion_rate    compras / views
 *   sales_velocity     vendas recentes com decaimento temporal (half-life)
 *   rating_bayesian    média bayesiana das reviews (evita bias de baixo volume)
 *   review_volume      nº de avaliações
 *   return_rate        taxa de devolução/reclamação (PENALIZA)
 *   seller_reputation  reputação do vendedor (0..1)
 *   engagement         favoritos + cliques (normalizado)
 *   recency_factor     recência do produto (novos ganham leve boost)
 *
 * FÓRMULA v1 (baseline sugerida — NÃO implementar ainda):
 *   final_score =
 *       w_conv    * conversion_rate
 *     + w_vel     * sales_velocity
 *     + w_rating  * rating_bayesian
 *     + w_eng     * engagement
 *     + w_rec     * recency_factor
 *     + w_rep     * seller_reputation
 *     - w_return  * return_rate
 *
 *   rating_bayesian = (C*m + sum_ratings) / (C + review_volume)
 *     C = peso do prior (ex: 20), m = média global das notas (ex: 4.0)
 *
 *   sales_velocity com decaimento: sum( venda_i * 0.5^(Δdias_i / HALF_LIFE) )
 *
 * PESOS: mantidos configuráveis (ver DEFAULT_WEIGHTS), afináveis por categoria.
 *
 * EVOLUÇÃO v2:
 *   - Collaborative filtering (usuários semelhantes) + content-based híbrido.
 *   - Roda em worker separado, materializa em product_scores.
 * =============================================================================
 */

export interface ScoreWeights {
  conversion: number;
  velocity: number;
  rating: number;
  engagement: number;
  recency: number;
  reputation: number;
  returnPenalty: number;
}

/** Pesos padrão da v1 — afinar por categoria conforme dados reais. */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  conversion: 0.30,
  velocity: 0.25,
  rating: 0.20,
  engagement: 0.10,
  recency: 0.05,
  reputation: 0.10,
  returnPenalty: 0.20,
};

/** Constantes do baseline (bayesian prior, half-life do decaimento em dias). */
export const RECO_CONFIG = {
  bayesianPriorWeight: 20, // C
  globalMeanRating: 4.0,   // m
  velocityHalfLifeDays: 14,
} as const;

export interface ProductFeatures {
  productId: string;
  categoryId: string;
  conversionRate: number;
  salesVelocity: number;
  ratingBayesian: number;
  reviewVolume: number;
  returnRate: number;
  sellerReputation: number;
  engagement: number;
  recencyFactor: number;
}

/**
 * Coleta as features cruas de um produto a partir do banco.
 * TODO: implementar queries (views/compras, reviews, favoritos, devoluções).
 */
export async function collectFeatures(_productId: string): Promise<ProductFeatures> {
  // TODO: buscar sinais no Supabase e normalizar.
  throw new Error('recommendationEngine.collectFeatures: not implemented (stub)');
}

/**
 * Calcula o score final a partir das features + pesos.
 * TODO: implementar a fórmula documentada no cabeçalho.
 */
export function computeScore(
  _features: ProductFeatures,
  _weights: ScoreWeights = DEFAULT_WEIGHTS,
): number {
  // TODO: aplicar fórmula ponderada v1.
  throw new Error('recommendationEngine.computeScore: not implemented (stub)');
}

/**
 * Recalcula scores de uma categoria inteira e persiste em product_scores,
 * incluindo rank_in_category. Chamado pelo cron do Coolify.
 * TODO: iterar produtos da categoria, computar, ordenar, gravar rank.
 */
export async function recomputeCategory(_categoryId: string): Promise<void> {
  // TODO: batch compute + upsert em product_scores + atribuir rank_in_category.
  throw new Error('recommendationEngine.recomputeCategory: not implemented (stub)');
}

/**
 * Lê os N produtos mais recomendados de uma categoria (apenas leitura de
 * product_scores já materializado — esta parte PODE ser usada assim que o
 * worker preencher a tabela).
 * TODO: implementar query ordenada por rank_in_category.
 */
export async function getTopForCategory(_categoryId: string, _limit = 20): Promise<string[]> {
  // TODO: select product_id from product_scores where category_id = ? order by rank_in_category limit ?
  throw new Error('recommendationEngine.getTopForCategory: not implemented (stub)');
}
