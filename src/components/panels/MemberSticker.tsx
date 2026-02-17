import { useState, useRef, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
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

  const commitEdit = () => {
    const val = Number(editValue);
    if (val > 0 && val !== hours && onEditHours) {
      onEditHours(val);
    }
    setEditing(false);
  };

  return (
    <div
      className="relative rounded-lg px-3 py-1.5 text-xs leading-normal flex items-center gap-1.5 cursor-default select-none transition-colors"
      style={{
        backgroundColor: colors.bg,
        color: 'hsl(0, 0%, 100%)',
        border: `1px solid ${colors.border}`,
        minWidth: 80,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditValue(String(hours));
        setEditing(true);
      }}
    >
      <span className="truncate max-w-[70px] font-medium">{userName}</span>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={1}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-8 bg-transparent border-b border-white/60 text-center font-bold outline-none text-xs"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="font-bold shrink-0">{hours}h</span>
      )}

      {hovered && !editing && (
        <>
          <button
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-sm hover:bg-secondary/80 transition-colors"
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
