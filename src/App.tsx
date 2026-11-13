import { Component, useEffect, type ReactNode } from 'react';
import { useRoute, navigate } from './lib/router';
import { useProfile, useBankVersion } from './lib/hooks';
import { Icon, cx } from './components/ui';
import { Home } from './screens/Home';
import { Practice, IntensiveSetup } from './screens/Practice';
import { Exams } from './screens/Exams';
import { Errors } from './screens/Errors';
import { Stats } from './screens/Stats';
import { SessionPlayer } from './screens/SessionPlayer';
import { Summary } from './screens/Summary';
import { GrammarList, GrammarDetail } from './screens/Grammar';
import { Flashcards } from './screens/Flashcards';
import { Plan } from './screens/Plan';
import { Settings } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { ExamDay } from './screens/ExamDay';

const TABS = [
  { path: '/', label: 'Accueil', icon: 'home' },
  { path: '/practice', label: 'Réviser', icon: 'book' },
  { path: '/exams', label: 'Examens', icon: 'exam' },
  { path: '/errors', label: 'Erreurs', icon: 'errors' },
  { path: '/stats', label: 'Stats', icon: 'stats' },
];

function BottomNav({ path }: { path: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" aria-label="Navigation principale">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {TABS.map((t) => {
          const active = t.path === '/' ? path === '/' : path.startsWith(t.path);
          return (
            <li key={t.path}>
              <button onClick={() => navigate(t.path)} aria-current={active ? 'page' : undefined} className={cx('flex w-full flex-col items-center gap-0.5 pb-1 pt-2 text-[11px] font-semibold', active ? 'text-primary' : 'text-muted')}>
                <span className={cx('grid h-8 w-14 place-items-center rounded-full transition', active && 'bg-primary-soft')}><Icon name={t.icon} size={21} /></span>
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <h1 className="text-xl font-bold">Oups, un problème est survenu</h1>
          <p className="text-sm text-muted">Tes données sont en sécurité (enregistrées sur l'appareil).</p>
          <pre className="mt-2 overflow-auto rounded-lg bg-surface-2 p-2 text-xs">{this.state.error.message}</pre>
          <button className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-ink" onClick={() => { this.setState({ error: null }); navigate('/'); }}>Revenir à l'accueil</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { path, params } = useRoute();
  const profile = useProfile();
  useBankVersion();
  useEffect(() => { document.title = 'TOEIC Sprint'; }, []);
  if (!profile) return <div className="grid min-h-dvh place-items-center text-muted">Chargement…</div>;
  if (!profile.onboarded && !path.startsWith('/session')) return <Onboarding />;

  let screen: ReactNode;
  let nav = true;
  if (path === '/') screen = <Home />;
  else if (path === '/practice') screen = <Practice />;
  else if (path === '/intensive') screen = <IntensiveSetup />;
  else if (path === '/exams') screen = <Exams />;
  else if (path === '/errors') screen = <Errors />;
  else if (path === '/stats') screen = <Stats />;
  else if (path === '/session') { screen = <SessionPlayer id={params.get('id') ?? ''} key={params.get('id')} />; nav = false; }
  else if (path === '/summary') screen = <Summary id={params.get('id') ?? ''} />;
  else if (path === '/grammar') screen = <GrammarList />;
  else if (path.startsWith('/grammar/')) screen = <GrammarDetail id={path.split('/')[2]} />;
  else if (path === '/flashcards') screen = <Flashcards />;
  else if (path === '/plan') screen = <Plan />;
  else if (path === '/settings') screen = <Settings />;
  else if (path === '/exam-day') screen = <ExamDay />;
  else screen = <Home />;

  return (
    <ErrorBoundary>
      {screen}
      {nav && <BottomNav path={path} />}
    </ErrorBoundary>
  );
}
