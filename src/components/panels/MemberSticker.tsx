import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { useAppContext } from '@/contexts/AppContext';

interface MemberStickerProps {
  userName: string;
  hours: number;
  disciplineId: string | null;
  onDelete: () => void;
  onCopy: () => void;
}

const MemberSticker = ({ userName, hours, disciplineId, onDelete, onCopy }: MemberStickerProps) => {
  const [hovered, setHovered] = useState(false);
  const { mode } = useAppContext();
  const colors = mode === 'record' ? getDisciplineColorRecord(disciplineId) : getDisciplineColor(disciplineId);

  return (
    <div
      className="relative rounded-md px-2 py-0.5 text-[10px] leading-tight flex items-center gap-1 cursor-default select-none transition-colors"
      style={{
        backgroundColor: colors.bg,
        color: 'hsl(0, 0%, 100%)',
        border: `1px solid ${colors.border}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="truncate max-w-[60px] font-medium">{userName}</span>
      <span className="font-bold shrink-0">{hours}h</span>

      {hovered && (
        <>
          <button
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <X className="h-2.5 w-2.5" />
          </button>
          <button
            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-sm hover:bg-secondary/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            title="Copy"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default MemberSticker;
