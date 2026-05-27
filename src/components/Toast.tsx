import { Toast } from '../hooks/useToast';

interface Props {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function ToastComponent({ toast, onClose }: Props) {
  return (
    <div className={`toast toast-${toast.type}`}>
      <p>{toast.message}</p>
      <button className="toast-close" onClick={() => onClose(toast.id)}>
        ✕
      </button>
    </div>
  );
}
