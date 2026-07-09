/**
 * Registro central de conectores dropship.
 * Resolve um DropshipProvider pelo slug (que casa com dropship_providers.slug).
 * Para adicionar um fornecedor: implemente DropshipProvider e registre aqui.
 */
import { DropshipProvider } from './DropshipProvider';
import { ExampleProvider } from './providers/ExampleProvider';

const providers = new Map<string, DropshipProvider>();

function register(p: DropshipProvider) {
  providers.set(p.slug, p);
}

// --- Conectores registrados ---
register(new ExampleProvider());
// register(new CJDropshippingProvider());
// register(new DSersProvider());
// register(new SpocketProvider());

export function getProvider(slug: string): DropshipProvider {
  const p = providers.get(slug);
  if (!p) throw new Error(`Dropship provider não registrado: ${slug}`);
  return p;
}

export function listProviders(): string[] {
  return [...providers.keys()];
}
