import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface BlockData {
  projectId: string;
  dates: string[]; // sorted date strings
  distribution: Record<string, number>; // date -> hours
}

interface HourBlockProps {
  block: BlockData;
  color: string;
  borderColor: string;
  /** Column indices (0-6) this block spans */
  startCol: number;
  endCol: number;
  isNew?: boolean; // just created via drag, needs total input
  onDistributionChange: (distribution: Record<string, number>) => void;
  onDelete?: () => void;
}

const HourBlock = ({
  block,
  color,
  borderColor,
  startCol,
  endCol,
  isNew,
  onDistributionChange,
}: HourBlockProps) => {
  const total = Object.values(block.distribution).reduce((s, v) => s + v, 0);
  const [showPopover, setShowPopover] = useState(false);
  const [localDist, setLocalDist] = useState<Record<string, number>>({});
  const [inlineEditing, setInlineEditing] = useState(isNew ?? false);
  const [inlineDraft, setInlineDraft] = useState('');
  const inlineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineEditing) {
      setTimeout(() => inlineRef.current?.focus(), 50);
    }
  }, [inlineEditing]);

  useEffect(() => {
    if (showPopover) {
      setLocalDist({ ...block.distribution });
    }
  }, [showPopover]);

  const commitInline = useCallback(() => {
    setInlineEditing(false);
    const num = parseFloat(inlineDraft);
    if (isNaN(num) || num <= 0) return;
    // Distribute evenly
    const count = block.dates.length;
    const perDay = Math.round((num / count) * 100) / 100;
    const dist: Record<string, number> = {};
    block.dates.forEach((d, i) => {
      // last day gets remainder to ensure exact total
      dist[d] = i === count - 1 ? Math.round((num - perDay * (count - 1)) * 100) / 100 : perDay;
    });
    onDistributionChange(dist);
  }, [inlineDraft, block.dates, onDistributionChange]);

  const commitPopover = useCallback(() => {
    setShowPopover(false);
    onDistributionChange(localDist);
  }, [localDist, onDistributionChange]);

  const localTotal = Object.values(localDist).reduce((s, v) => s + v, 0);

  // Position: percentage-based within the 7-col area
  const leftPct = (startCol / 7) * 100;
  const widthPct = ((endCol - startCol + 1) / 7) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 z-10 flex items-center justify-center"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        padding: '2px',
        pointerEvents: 'auto',
      }}
    >
      <Popover open={showPopover} onOpenChange={(open) => {
        if (!open) commitPopover();
        else setShowPopover(true);
      }}>
        <PopoverTrigger asChild>
          <div
            className="w-full h-[28px] rounded-md flex items-center justify-center cursor-pointer text-sm font-semibold tabular-nums select-none"
            style={{
              backgroundColor: `${color}40`,
              border: `2px solid ${borderColor}`,
              color: borderColor,
            }}
            onClick={(e) => {
              if (inlineEditing) {
                e.stopPropagation();
                return;
              }
              setShowPopover(true);
            }}
          >
            {inlineEditing ? (
              <input
                ref={inlineRef}
                className="w-full h-full text-center bg-transparent outline-none text-sm font-semibold tabular-nums"
                style={{ color: borderColor }}
                placeholder="hrs"
                value={inlineDraft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setInlineDraft(e.target.value)}
                onBlur={commitInline}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitInline();
                  if (e.key === 'Escape') setInlineEditing(false);
                }}
              />
            ) : total > 0 ? (
              total
            ) : (
              <span className="opacity-50 text-xs">click to set</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {format(new Date(block.dates[0] + 'T00:00'), 'EEE d')} – {format(new Date(block.dates[block.dates.length - 1] + 'T00:00'), 'EEE d')}
            </div>
            {block.dates.map((dateStr) => {
              const dayLabel = format(new Date(dateStr + 'T00:00'), 'EEE d');
              return (
                <div key={dateStr} className="flex items-center gap-2 text-sm">
                  <span className="w-14 text-muted-foreground">{dayLabel}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="w-16 h-7 rounded border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                    value={localDist[dateStr] ?? 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLocalDist((prev) => ({ ...prev, [dateStr]: v }));
                    }}
                  />
                </div>
              );
            })}
            <div className="flex items-center gap-2 text-sm font-semibold pt-1 border-t">
              <span className="w-14">Total</span>
              <span className="w-16 text-center tabular-nums">{Math.round(localTotal * 100) / 100}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HourBlock;
