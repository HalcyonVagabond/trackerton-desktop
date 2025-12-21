import { useState } from 'react';

type DeleteType = 'organization' | 'project' | 'task';

interface DeleteModalState {
  isOpen: boolean;
  type: DeleteType;
  itemName: string;
  itemId: number | null;
}

export function useDeleteModal() {
  const [modalState, setModalState] = useState<DeleteModalState>({
    isOpen: false,
    type: 'organization',
    itemName: '',
    itemId: null,
  });

  const openModal = (
    type: DeleteType,
    itemName: string,
    itemId: number
  ) => {
    setModalState({
      isOpen: true,
      type,
      itemName,
      itemId,
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
