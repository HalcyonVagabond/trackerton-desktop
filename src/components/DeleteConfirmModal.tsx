import { useState } from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  type: 'organization' | 'project' | 'task';
  itemName: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemName,
}: DeleteConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Delete {typeLabel}</h3>
        <p style={{ marginBottom: '20px', fontSize: '15px', lineHeight: '1.5' }}>
          Are you sure you want to delete <strong>"{itemName}"</strong>?
          {type === 'organization' && (
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--text-secondary)' }}>
              This will also delete all associated projects and tasks.
            </span>
          )}
          {type === 'project' && (
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--text-secondary)' }}>
              This will also delete all associated tasks.
            </span>
          )}
        </p>
        {error && (
          <div style={{ color: 'var(--button-red)', fontSize: '14px', marginBottom: '16px' }}>
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button
            className="btn btn--cancel"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn btn--delete"
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(140deg, var(--button-red) 0%, var(--button-red-hover) 100%)',
              color: '#fdfbf7',
              borderColor: 'var(--button-red-hover)',
            }}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
