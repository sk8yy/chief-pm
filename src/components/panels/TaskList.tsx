import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  is_completed: boolean;
  project_id: string;
  user_id: string;
  week_start: string;
}

interface Props {
  tasks: Task[];
  onToggle: (id: string, is_completed: boolean) => void;
  title?: string;
  compact?: boolean;
}

const TaskList: React.FC<Props> = ({ tasks, onToggle, title = 'Tasks', compact = false }) => {
  if (tasks.length === 0) return null;

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className="flex items-center gap-1.5 mb-1">
        <ListTodo className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-primary`} />
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wide text-muted-foreground`}>
          {title} ({tasks.length})
        </span>
      </div>
      {tasks.map((task) => (
        <label
          key={task.id}
          className={`flex items-start gap-2 cursor-pointer group ${compact ? 'py-0.5 px-1' : 'py-1 px-2'} rounded hover:bg-muted/30 transition-colors`}
        >
          <Checkbox
            checked={task.is_completed}
            onCheckedChange={(checked) => onToggle(task.id, !!checked)}
            className={`${compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5'} shrink-0`}
          />
          <span
            className={`${compact ? 'text-[11px]' : 'text-xs'} leading-snug ${
              task.is_completed
                ? 'line-through text-muted-foreground/60'
                : 'text-foreground'
            }`}
          >
            {task.description}
          </span>
        </label>
      ))}
    </div>
  );
};

export default TaskList;
