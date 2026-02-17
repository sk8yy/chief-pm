import { useAppContext } from '@/contexts/AppContext';
import AppHeader from '@/components/AppHeader';
import DisciplineOverview from '@/components/panels/DisciplineOverview';
import PersonalSchedule from '@/components/panels/PersonalSchedule';
import ProjectManagement from '@/components/panels/ProjectManagement';

const panelComponents = {
  discipline: DisciplineOverview,
  personal: PersonalSchedule,
  project: ProjectManagement,
};

const Index = () => {
  const { activePanel } = useAppContext();
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

export default Index;
