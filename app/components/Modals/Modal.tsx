import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-auto relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b px-4 md:px-6 py-3 md:py-4">
          <h2 className="text-base md:text-lg font-semibold">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-2 -mr-2"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal; 