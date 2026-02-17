import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
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

const WorkspaceView = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { activePanel, setWorkspaceId } = useAppContext();

  useEffect(() => {
    if (workspaceId) setWorkspaceId(workspaceId);
    return () => setWorkspaceId(null);
  }, [workspaceId, setWorkspaceId]);

  const Panel = panelComponents[activePanel];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main>
        <Panel />
      </main>
    </div>
  );
};

export default WorkspaceView;
