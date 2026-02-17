import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspaces';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, FolderOpen, Pencil, Check } from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const [showExisting, setShowExisting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    const ws = await createWorkspace.mutateAsync('New Project');
    navigate(`/setup/${ws.id}`);
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await updateWorkspace.mutateAsync({ id, name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-12 animate-pulse bg-gradient-to-r from-[hsl(262,47%,55%)] via-[hsl(207,89%,61%)] via-[hsl(122,39%,49%)] via-[hsl(36,100%,50%)] to-[hsl(14,100%,63%)] bg-clip-text text-transparent leading-tight pb-2">
        Welcome to Chief Project Manager!
      </h1>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <Card
          className="flex-1 p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/40 flex flex-col items-center gap-4"
          onClick={handleCreate}
        >
          <Plus className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Create a project of your own</h2>
          <p className="text-sm text-muted-foreground text-center">Start fresh with your own disciplines and categories</p>
        </Card>

        <Card
          className="flex-1 p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/40 flex flex-col items-center gap-4"
          onClick={() => setShowExisting(!showExisting)}
        >
          <FolderOpen className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Open existing project</h2>
          <p className="text-sm text-muted-foreground text-center">Resume a saved workspace</p>
        </Card>
      </div>

      {showExisting && (
        <div className="mt-8 w-full max-w-2xl space-y-3">
          <h3 className="text-lg font-semibold text-foreground mb-3">Saved Projects</h3>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {workspaces?.map((ws) => (
            <Card
              key={ws.id}
              className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (editingId !== ws.id) navigate(`/workspace/${ws.id}`);
              }}
            >
              {editingId === ws.id ? (
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(ws.id)}
                    className="h-8"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleRename(ws.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-foreground">{ws.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(ws.id);
                      setEditName(ws.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </Card>
          ))}
          {workspaces?.length === 0 && <p className="text-muted-foreground">No saved projects yet.</p>}
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
