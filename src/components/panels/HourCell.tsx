import { useState, useRef, useEffect } from 'react';
import type { ModeType } from '@/contexts/AppContext';

interface HourCellProps {
  value: number;
  plannedValue: number;
  mode: ModeType;
  color: string;
  dimmed: boolean;
  onChange: (v: number) => void;
  isDragHighlighted?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
}

const HourCell = ({ value, plannedValue, mode, color, dimmed, onChange, isDragHighlighted, onDragStart, onDragEnter }: HourCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  const diff = mode === 'record' && plannedValue > 0 ? value - plannedValue : null;

  return (
    <div
      className={`border-r min-h-[32px] flex items-center justify-center cursor-pointer transition-colors select-none ${dimmed ? 'opacity-40' : ''}`}
      style={{
        backgroundColor: isDragHighlighted
          ? `${color}50`
          : value > 0
            ? `${color}30`
            : undefined,
        outline: isDragHighlighted ? `2px solid ${color}` : undefined,
        outlineOffset: '-2px',
      }}
      onClick={() => {
        if (!editing) {
          setDraft(value > 0 ? String(value) : '');
          setEditing(true);
        }
      }}
      onMouseDown={(e) => {
        if (e.button === 0 && !editing) {
          e.preventDefault();
          onDragStart?.();
        }
      }}
      onMouseEnter={() => {
        onDragEnter?.();
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="w-full h-full text-center bg-transparent outline-none text-sm tabular-nums"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : value > 0 ? (
        <div className="text-center text-sm tabular-nums leading-tight">
          <div>{value}</div>
          {diff !== null && diff !== 0 && (
            <div className={`text-[10px] ${diff > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {diff > 0 ? '+' : ''}{diff}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default HourCell;
