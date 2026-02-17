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
  const { activePanel, setWorkspaceId, profileId, isSandbox, setIsSandbox } = useAppContext();
  const { data: workspaces } = useWorkspaces(profileId);

  useEffect(() => {
    if (workspaceId) setWorkspaceId(workspaceId);
    return () => {
      setWorkspaceId(null);
      setIsSandbox(false);
    };
  }, [workspaceId, setWorkspaceId, setIsSandbox]);

  // Sandbox mode: sample workspace is sandbox for non-owners
  useEffect(() => {
    if (!workspaceId || !workspaces) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (workspaceId === SAMPLE_WORKSPACE_ID && ws?.owner_id && ws.owner_id !== profileId) {
      setIsSandbox(true);
    } else {
      setIsSandbox(false);
    }
  }, [workspaceId, workspaces, profileId, setIsSandbox]);

  const Panel = panelComponents[activePanel];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      {isSandbox && (
        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-center text-sm py-1.5 px-4 border-b border-blue-200 dark:border-blue-800">
          🧪 Sample workspace — try everything! Changes are preview-only and won't be saved.
        </div>
      )}
      <main>
        <Panel />
      </main>
    </div>
  );
};

export default WorkspaceView;
