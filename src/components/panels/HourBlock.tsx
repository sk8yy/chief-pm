import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface BlockData {
  projectId: string;
  dates: string[];
  distribution: Record<string, number>;
}

interface HourBlockProps {
  block: BlockData;
  color: string;
  borderColor: string;
  startCol: number;
  endCol: number;
  isNew?: boolean;
  onDistributionChange: (distribution: Record<string, number>) => void;
  onDelete?: () => void;
}

/** Distribute `total` integer hours as evenly as possible across `count` days */
function distributeEvenly(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

const HourBlock = ({
  block,
  color,
  borderColor,
  startCol,
  endCol,
  isNew,
  onDistributionChange,
  onDelete,
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
    const num = parseInt(inlineDraft, 10);
    if (isNaN(num) || num <= 0) return;
    const vals = distributeEvenly(num, block.dates.length);
    const dist: Record<string, number> = {};
    block.dates.forEach((d, i) => { dist[d] = vals[i]; });
    onDistributionChange(dist);
  }, [inlineDraft, block.dates, onDistributionChange]);

  const handleConfirm = useCallback(() => {
    setShowPopover(false);
    onDistributionChange(localDist);
  }, [localDist, onDistributionChange]);

  const handleDiscard = useCallback(() => {
    setShowPopover(false);
    // Don't save — just close
  }, []);

  const handleDelete = useCallback(() => {
    setShowPopover(false);
    if (onDelete) {
      onDelete();
    } else {
      // Clear all hours to 0
      const zeroDist: Record<string, number> = {};
      block.dates.forEach((d) => { zeroDist[d] = 0; });
      onDistributionChange(zeroDist);
    }
  }, [block.dates, onDelete, onDistributionChange]);

  const localTotal = Object.values(localDist).reduce((s, v) => s + v, 0);

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
        if (!open) {
          // Closing without buttons = discard
          setShowPopover(false);
        } else {
          setShowPopover(true);
        }
      }}>
        <PopoverTrigger asChild>
          <div
            className="w-full h-[28px] rounded-md flex items-center justify-center cursor-pointer text-sm font-semibold tabular-nums select-none relative group"
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
            {/* Delete button */}
            {!inlineEditing && total > 0 && (
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {inlineEditing ? (
              <input
                ref={inlineRef}
                className="w-full h-full text-center bg-transparent outline-none text-sm font-semibold tabular-nums"
                style={{ color: borderColor }}
                placeholder="hrs"
                value={inlineDraft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  // Integer only
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setInlineDraft(val);
                }}
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
                    step={1}
                    className="w-16 h-7 rounded border border-input bg-background px-2 text-center text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
                    value={localDist[dateStr] ?? 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 0;
                      setLocalDist((prev) => ({ ...prev, [dateStr]: Math.max(0, v) }));
                    }}
                  />
                </div>
              );
            })}
            <div className="flex items-center gap-2 text-sm font-semibold pt-1 border-t">
              <span className="w-14">Total</span>
              <span className="w-16 text-center tabular-nums">{localTotal}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleDiscard}>
                Discard
              </Button>
              <Button size="sm" className="flex-1" onClick={handleConfirm}>
                Confirm
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HourBlock;
