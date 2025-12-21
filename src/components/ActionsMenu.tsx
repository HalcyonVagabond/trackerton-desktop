import { useRef, useEffect } from 'react';

interface ActionMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
}

interface ActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: ActionMenuItem[];
}

export function ActionsMenu({ isOpen, onClose, items }: ActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="actions-menu">
      {items.map((item, index) => (
        <button
          key={index}
          className={`actions-menu__item ${item.className || ''}`}
          onClick={item.onClick}
        >
          <span className="actions-menu__icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
