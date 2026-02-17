import { toast } from 'sonner';

export function sandboxToast() {
  toast.info('🧪 Sandbox — changes are preview-only', { id: 'sandbox' });
}
