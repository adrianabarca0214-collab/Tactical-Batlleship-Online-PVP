import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onCancel, title, message, confirmText, confirmButtonClass = 'btn-red' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 fade-in">
      <div className="w-full max-w-md command-panel p-6 space-y-4">
        <h2 className="text-3xl font-bold command-title text-center">{title}</h2>
        <p className="text-slate-300 text-center">{message}</p>
        <div className="flex justify-center gap-4 pt-4">
          <button onClick={onCancel} className="btn-angular bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6">
            Cancel
          </button>
          <button onClick={onConfirm} className={`btn-angular ${confirmButtonClass} text-white font-bold py-2 px-6`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;