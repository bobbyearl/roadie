import { type LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export function IconButton({ icon: Icon, label, onClick, disabled, active, title, className, children }: IconButtonProps) {
  const base = label ? 'btn-label' : 'btn-icon';
  const classes = `${base} ${active ? 'btn-active' : ''} ${className ?? ''}`.trim();

  return (
    <button className={classes} onClick={onClick} disabled={disabled} title={title}>
      <Icon size={14} />
      {label && ` ${label}`}
      {children}
    </button>
  );
}
