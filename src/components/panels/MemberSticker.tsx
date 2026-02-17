import { useState, useRef, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { useAppContext } from '@/contexts/AppContext';

interface MemberStickerProps {
  userName: string;
  hours: number;
  disciplineId: string | null;
  onDelete: () => void;
  onCopy: () => void;
  onEditHours?: (newHours: number) => void;
}

const MemberSticker = ({ userName, hours, disciplineId, onDelete, onCopy, onEditHours }: MemberStickerProps) => {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(hours));
  const inputRef = useRef<HTMLInputElement>(null);
  const { mode } = useAppContext();
  const colors = mode === 'record' ? getDisciplineColorRecord(disciplineId) : getDisciplineColor(disciplineId);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const confirmEdit = () => {
    const val = Number(editValue);
    if (val > 0 && onEditHours) {
      onEditHours(val);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(String(hours));
    setEditing(false);
  };

  return (
    <div
      className="relative rounded-lg px-3 py-2 text-xs leading-normal flex items-center gap-2 cursor-default select-none transition-colors"
      style={{
        backgroundColor: colors.bg,
        color: 'hsl(0, 0%, 100%)',
        border: `1px solid ${colors.border}`,
        minWidth: 100,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditValue(String(hours));
        setEditing(true);
      }}
    >
      <span className="truncate max-w-[80px] font-medium">{userName}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="number"
            min={1}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
            className="w-10 bg-transparent border-b border-white/60 text-center font-bold outline-none text-xs"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); confirmEdit(); }}
            title="Confirm"
          >
            <Check className="h-2.5 w-2.5" />
          </button>
          <button
            className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
            title="Cancel"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <span className="font-bold shrink-0">{hours}h</span>
      )}

      {hovered && !editing && (
        <>
          <button
            className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-sm hover:bg-secondary/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
};

export default MemberSticker;
