export interface ConfirmationModalState {
  title: string;
  subtext?: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}