import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureReferralFromUrl } from '../lib/affiliates';

/** Captura ?ref=CODIGO em qualquer rota (link de afiliado) e guarda a atribuição. */
export default function ReferralCapture() {
  const { search } = useLocation();
  useEffect(() => {
    if (search.includes('ref=')) captureReferralFromUrl(search);
  }, [search]);
  return null;
}
