import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ListTodo } from 'lucide-react';
import { getDisciplineColor } from '@/lib/colors';

interface Task {
  id: string;
  description: string;
  is_completed: boolean;
  project_id: string;
  user_id: string;
  week_start: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface UserInfo {
  id: string;
  name: string;
  discipline_id: string | null;
}

interface ProjectInfo {
  id: string;
  name: string;
}

interface Props {
  tasks: Task[];
  onToggle: (id: string, is_completed: boolean) => void;
  title?: string;
  compact?: boolean;
  /** Show assignee stickers per task (used in Panel 1) */
  showAssignees?: boolean;
  users?: UserInfo[];
  /** Show project name per task (used in Panel 2) */
  showProject?: boolean;
  projects?: ProjectInfo[];
  /** Show dates per task */
  showDates?: boolean;
}

const TaskList: React.FC<Props> = ({
  tasks, onToggle, title = 'Tasks', compact = false,
  showAssignees = false, users = [],
  showProject = false, projects = [],
  showDates = false,
}) => {
  // Group tasks by description for assignee sticker display
  const groupedTasks = React.useMemo(() => {
    if (!showAssignees) return null;
    const groups: Record<string, { tasks: Task[]; userIds: string[] }> = {};
    tasks.forEach(task => {
      const key = `${task.description.toLowerCase().trim()}_${task.project_id}`;
      if (!groups[key]) groups[key] = { tasks: [], userIds: [] };
      groups[key].tasks.push(task);
      if (!groups[key].userIds.includes(task.user_id)) {
        groups[key].userIds.push(task.user_id);
      }
    });
    return groups;
  }, [tasks, showAssignees]);

  if (tasks.length === 0) return null;

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <div className="flex items-center gap-1.5 mb-1">
        <ListTodo className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-primary`} />
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wide text-muted-foreground`}>
          {title} ({showAssignees && groupedTasks ? Object.keys(groupedTasks).length : tasks.length})
        </span>
      </div>

      {showAssignees && groupedTasks ? (
        // Grouped view with assignee stickers
        Object.entries(groupedTasks).map(([key, group]) => {
          const primaryTask = group.tasks[0];
          const allCompleted = group.tasks.every(t => t.is_completed);
          const projectName = projects.find(p => p.id === primaryTask.project_id)?.name;
          return (
            <div
              key={key}
              className={`flex items-start gap-2 ${compact ? 'py-0.5 px-1' : 'py-1 px-2'} rounded hover:bg-muted/30 transition-colors`}
            >
              <Checkbox
                checked={allCompleted}
                onCheckedChange={(checked) => {
                  group.tasks.forEach(t => onToggle(t.id, !!checked));
                }}
                className={`${compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5'} shrink-0`}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`${compact ? 'text-[11px]' : 'text-xs'} leading-snug ${
                    allCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'
                  }`}
                >
                  {primaryTask.description}
                </span>
                {projectName && (
                  <span className="text-[10px] text-muted-foreground ml-1">({projectName})</span>
                )}
                {/* Assignee stickers */}
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {group.userIds.map(uid => {
                    const user = users.find(u => u.id === uid);
                    if (!user) return null;
                    const color = getDisciplineColor(user.discipline_id);
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                        style={{ backgroundColor: `${color.bg}30`, color: color.text, border: `1px solid ${color.border}40` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.bg }} />
                        {user.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        // Flat list view
        tasks.map((task) => {
          const projectName = showProject ? projects.find(p => p.id === task.project_id)?.name : null;
          return (
            <label
              key={task.id}
              className={`flex items-start gap-2 cursor-pointer group ${compact ? 'py-0.5 px-1' : 'py-1 px-2'} rounded hover:bg-muted/30 transition-colors`}
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={(checked) => onToggle(task.id, !!checked)}
                className={`${compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5'} shrink-0`}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`${compact ? 'text-[11px]' : 'text-xs'} leading-snug ${
                    task.is_completed ? 'line-through text-muted-foreground/60' : 'text-foreground'
                  }`}
                >
                  {task.description}
                </span>
                {(projectName || (showDates && (task.start_date || task.end_date))) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {projectName && (
                      <span className="text-[10px] text-muted-foreground">{projectName}</span>
                    )}
                    {showDates && task.end_date && (
                      <span className="text-[10px] text-muted-foreground">
                        Due: {task.end_date}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </label>
          );
        })
      )}
    </div>
  );
};

export default TaskList;
