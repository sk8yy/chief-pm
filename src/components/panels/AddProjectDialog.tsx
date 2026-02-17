import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ChevronDown, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  job_number: string;
  discipline_id: string | null;
}

interface Discipline {
  id: string;
  name: string;
  color: string;
}

interface AddProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (projectIds: string[]) => void;
  projects: Project[];
  disciplines: Discipline[];
  /** Project IDs already assigned */
  assignedProjectIds: Set<string>;
}

const AddProjectDialog = ({ open, onClose, onConfirm, projects, disciplines, assignedProjectIds }: AddProjectDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedDiscs, setExpandedDiscs] = useState<Set<string>>(new Set(disciplines.map(d => d.id)));
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dialogRef.current && !dialogRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggleDisc = (id: string) => {
    setExpandedDiscs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleProject = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const availableProjects = projects.filter(p => !assignedProjectIds.has(p.id));
  const grouped = disciplines
    .map(d => ({
      discipline: d,
      projects: availableProjects.filter(p => p.discipline_id === d.id),
    }))
    .filter(g => g.projects.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={dialogRef} className="bg-card border rounded-lg shadow-lg w-[360px] max-h-[480px] flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Add Projects to Schedule</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-3">
          {grouped.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">All projects are already assigned.</div>
          )}
          {grouped.map(g => (
            <div key={g.discipline.id} className="mb-2">
              <button
                className="flex items-center gap-2 w-full text-left text-xs font-semibold py-1 hover:bg-muted/30 rounded px-1"
                onClick={() => toggleDisc(g.discipline.id)}
              >
                {expandedDiscs.has(g.discipline.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.discipline.color }} />
                {g.discipline.name}
                <span className="text-muted-foreground ml-auto">{g.projects.length}</span>
              </button>
              {expandedDiscs.has(g.discipline.id) && (
                <div className="ml-5 space-y-0.5">
                  {g.projects.map(p => {
                    const isSelected = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'}`}
                        onClick={() => toggleProject(p.id)}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground ml-auto text-[10px]">{p.job_number}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </ScrollArea>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={selected.size === 0} onClick={() => onConfirm(Array.from(selected))}>
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectDialog;
