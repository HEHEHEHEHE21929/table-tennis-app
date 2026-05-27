import Toast from './Toast';
import { Toast as ToastType } from '../hooks/useToast';

interface Props {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
