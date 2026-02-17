import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import AppHeader from '@/components/AppHeader';
import StickerWall from '@/components/panels/StickerWall';
import DisciplineOverview from '@/components/panels/DisciplineOverview';
import PersonalSchedule from '@/components/panels/PersonalSchedule';
import ProjectManagement from '@/components/panels/ProjectManagement';

const panelComponents = {
  sticker: StickerWall,
  discipline: DisciplineOverview,
  personal: PersonalSchedule,
  project: ProjectManagement,
};

const SAMPLE_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

const WorkspaceView = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { activePanel, setWorkspaceId, profileId, setIsReadOnly } = useAppContext();
  const { data: workspaces } = useWorkspaces(profileId);

  useEffect(() => {
    if (workspaceId) setWorkspaceId(workspaceId);
    return () => {
      setWorkspaceId(null);
      setIsReadOnly(false);
    };
  }, [workspaceId, setWorkspaceId, setIsReadOnly]);

  // Determine read-only: sample workspace is read-only for non-owners
  useEffect(() => {
    if (!workspaceId || !workspaces) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (workspaceId === SAMPLE_WORKSPACE_ID && ws?.owner_id && ws.owner_id !== profileId) {
      setIsReadOnly(true);
    } else {
      setIsReadOnly(false);
    }
  }, [workspaceId, workspaces, profileId, setIsReadOnly]);

  const Panel = panelComponents[activePanel];
  const { isReadOnly } = useAppContext();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      {isReadOnly && (
        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-center text-sm py-1.5 px-4 border-b border-amber-200 dark:border-amber-800">
          🔒 This is a sample project — view only
        </div>
      )}
      <main className={isReadOnly ? 'pointer-events-none opacity-80 select-none' : ''}>
        <Panel />
      </main>
    </div>
  );
};

export default WorkspaceView;
