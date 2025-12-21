import { useState, useEffect } from 'react';

interface GenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  type: 'organization' | 'project' | 'task';
  mode: 'add' | 'edit';
  initialValue?: string;
}

export function GenericModal({
  isOpen,
  onClose,
  onSave,
  type,
  mode,
  initialValue = '',
}: GenericModalProps) {
  const [name, setName] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes or initial value changes
  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setError('');
    }
  }, [isOpen, initialValue]);

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const title = mode === 'add' ? `Add ${typeLabel}` : `Edit ${typeLabel}`;

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Please enter a name.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(trimmedName);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setError('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <input
          type="text"
          className="modal-input"
          placeholder={`${typeLabel} Name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isLoading}
        />
        {error && (
          <div style={{ color: 'var(--button-red)', fontSize: '14px', marginTop: '8px' }}>
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
            className="btn btn--save"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
