import { useAppContext, PanelType } from '@/contexts/AppContext';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, Calendar, FolderKanban } from 'lucide-react';

const panels: { key: PanelType; label: string; icon: React.ReactNode }[] = [
  { key: 'discipline', label: 'Discipline Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'personal', label: 'Personal Schedule', icon: <Calendar className="h-4 w-4" /> },
  { key: 'project', label: 'Project Management', icon: <FolderKanban className="h-4 w-4" /> },
];

const AppHeader = () => {
  const { activePanel, setActivePanel, mode, setMode, currentUserId, setCurrentUserId } = useAppContext();
  const { data: users } = useUsers();

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-2 gap-4">
      <nav className="flex items-center gap-1">
        {panels.map((p) => (
          <Button
            key={p.key}
            variant={activePanel === p.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivePanel(p.key)}
            className="gap-1.5"
          >
            {p.icon}
            <span className="hidden sm:inline">{p.label}</span>
          </Button>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className={mode === 'plan' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>Plan</span>
          <Switch
            checked={mode === 'record'}
            onCheckedChange={(checked) => setMode(checked ? 'record' : 'plan')}
          />
          <span className={mode === 'record' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>Record</span>
        </div>

        {activePanel === 'personal' && (
          <Select value={currentUserId ?? ''} onValueChange={setCurrentUserId}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
