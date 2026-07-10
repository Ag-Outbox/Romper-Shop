import type { Role } from './auth';
import { listSellerSubOrders } from './orders';
import { listPendingSellers } from './sellers';
import { listPendingPayouts } from './payouts';

/** Quantas coisas precisam da atenção do usuário agora (pedido a enviar,
 *  loja/saque a aprovar...). Usado no badge da conta na Home e na TopBar. */
export function pendingActionCount(user: { role: Role; storeSlug?: string } | null): number {
  if (!user) return 0;
  if (user.role === 'seller' && user.storeSlug) {
    return listSellerSubOrders(user.storeSlug).filter((so) => so.status !== 'delivered').length;
  }
  if (user.role === 'admin') {
    return listPendingSellers().length + listPendingPayouts().length;
  }
  return 0;
}
