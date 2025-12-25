import { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface MoreMenuProps {
  items: MenuItem[];
  className?: string;
}

export function MoreMenu({ items, className = '' }: MoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleItemClick = (e: React.MouseEvent, onClick: () => void) => {
    e.stopPropagation();
    setIsOpen(false);
    onClick();
  };

  return (
    <div className={`more-menu ${className}`} ref={menuRef}>
      <button
        ref={triggerRef}
        className="more-menu__trigger"
        onClick={handleToggle}
        title="More actions"
        type="button"
      >
        ⋮
      </button>
      {isOpen && (
        <div className="more-menu__dropdown" style={dropdownStyle}>
          {items.map((item, index) => (
            <button
              key={index}
              className={`more-menu__item ${item.variant === 'danger' ? 'more-menu__item--danger' : ''}`}
              onClick={(e) => handleItemClick(e, item.onClick)}
              type="button"
            >
              {item.icon && <span className="more-menu__icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
