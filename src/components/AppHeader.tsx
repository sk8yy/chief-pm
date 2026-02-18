import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, PanelType } from '@/contexts/AppContext';
import { useUsers } from '@/hooks/useUsers';
import { useWorkspaces, useUpdateWorkspace } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, Calendar, FolderKanban, StickyNote, LogOut } from 'lucide-react';

const panels: { key: PanelType; label: string; icon: React.ReactNode }[] = [
  { key: 'sticker', label: 'Sticker Wall', icon: <StickyNote className="h-4 w-4" /> },
  { key: 'discipline', label: 'Discipline Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'personal', label: 'Personal Schedule', icon: <Calendar className="h-4 w-4" /> },
  { key: 'project', label: 'Project Management', icon: <FolderKanban className="h-4 w-4" /> },
];

const AppHeader = () => {
  const navigate = useNavigate();
  const { activePanel, setActivePanel, mode, setMode, currentUserId, setCurrentUserId, workspaceId } = useAppContext();
  const { data: users } = useUsers();
  const { data: workspaces } = useWorkspaces();
  const updateWorkspace = useUpdateWorkspace();
  const currentWorkspace = workspaces?.find(w => w.id === workspaceId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const startEditing = () => {
    if (currentWorkspace) {
      setNameValue(currentWorkspace.name);
      setEditingName(true);
    }
  };

  const saveName = async () => {
    if (nameValue.trim() && currentWorkspace && nameValue.trim() !== currentWorkspace.name) {
      await updateWorkspace.mutateAsync({ id: currentWorkspace.id, name: nameValue.trim() });
    }
    setEditingName(false);
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex items-center justify-between px-4 py-2 gap-4 max-w-7xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
          {currentWorkspace && (
            editingName ? (
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="h-7 w-40 text-sm border-l ml-1"
                autoFocus
              />
            ) : (
              <span
                className="text-sm font-medium text-muted-foreground border-l pl-2 ml-1 cursor-pointer hover:text-foreground"
                onDoubleClick={startEditing}
                title="Double-click to rename"
              >
                {currentWorkspace.name}
              </span>
            )
          )}
        </div>

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
          {activePanel !== 'sticker' && (
            <div className="flex items-center gap-2 text-sm">
              <span className={mode === 'plan' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>Plan</span>
              <Switch
                checked={mode === 'record'}
                onCheckedChange={(checked) => setMode(checked ? 'record' : 'plan')}
              />
              <span className={mode === 'record' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>Record</span>
            </div>
          )}

          {(activePanel === 'personal' || activePanel === 'sticker') && (
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
      </div>
    </header>
  );
};

export default AppHeader;
