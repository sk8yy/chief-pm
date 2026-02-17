import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace } from '@/hooks/useWorkspaces';
import { useDeleteWorkspace } from '@/hooks/useDeleteWorkspace';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, FolderOpen, Pencil, Check, Trash2, LogOut } from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { profileId, profile, loading: profileLoading, createProfile, logout } = useProfile();
  const { data: workspaces, isLoading } = useWorkspaces(profileId);
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const [showExisting, setShowExisting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const handleCreate = async () => {
    const ws = await createWorkspace.mutateAsync({ name: 'New Project', ownerId: profileId });
    navigate(`/setup/${ws.id}`);
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await updateWorkspace.mutateAsync({ id, name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteWorkspace.mutateAsync(deletingId);
    setDeletingId(null);
  };

  const handleSignIn = async () => {
    if (!nameInput.trim()) return;
    await createProfile(nameInput.trim());
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Name input gate
  if (!profileId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-12 animate-pulse bg-gradient-to-r from-[hsl(262,47%,55%)] via-[hsl(207,89%,61%)] via-[hsl(122,39%,49%)] via-[hsl(36,100%,50%)] to-[hsl(14,100%,63%)] bg-clip-text text-transparent leading-tight pb-2">
          Welcome to Chief Project Manager!
        </h1>
        <Card className="p-8 max-w-md w-full flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">Enter your name to get started</h2>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            placeholder="Your display name"
            className="text-center"
            autoFocus
          />
          <Button onClick={handleSignIn} disabled={!nameInput.trim()} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{profile?.display_name}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

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
        <div className="mt-8 w-full max-w-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-3">Saved Projects</h3>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {workspaces?.map((ws) => (
              <Card
                key={ws.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30 flex flex-col items-center gap-2 relative group"
                onClick={() => {
                  if (editingId !== ws.id) navigate(`/workspace/${ws.id}`);
                }}
              >
                {editingId === ws.id ? (
                  <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(ws.id)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleRename(ws.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    <span className="font-medium text-foreground text-center text-sm">{ws.name}</span>
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded hover:bg-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(ws.id);
                          setEditName(ws.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(ws.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
          {workspaces?.length === 0 && <p className="text-muted-foreground">No saved projects yet.</p>}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WelcomePage;
