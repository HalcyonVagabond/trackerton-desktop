import { useState } from 'react';

type ModalType = 'organization' | 'project' | 'task';
type ModalMode = 'add' | 'edit';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  mode: ModalMode;
  initialValue: string;
  editingItemId: number | null;
}

export function useGenericModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'organization',
    mode: 'add',
    initialValue: '',
    editingItemId: null,
  });

  const openModal = (
    type: ModalType,
    mode: ModalMode,
    initialValue: string = '',
    editingItemId: number | null = null
  ) => {
    setModalState({
      isOpen: true,
      type,
      mode,
      initialValue,
      editingItemId,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    ...modalState,
    openModal,
    closeModal,
  };
}
