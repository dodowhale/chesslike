import { lazy } from 'solid-js';
import { Navigate, Route, Router } from '@solidjs/router';

const MainMenu = lazy(() => import('@/routes/MainMenu'));
const ClassicEntry = lazy(() => import('@/routes/ClassicEntry'));
const ClassicSingleOptions = lazy(() => import('@/routes/ClassicSingleOptions'));
const ClassicSinglePlay = lazy(() => import('@/routes/ClassicSinglePlay'));
const ClassicLocalPlay = lazy(() => import('@/routes/ClassicLocalPlay'));
const AdventureEntry = lazy(() => import('@/routes/AdventureEntry'));

export default function App() {
  return (
    <Router>
      <Route path="/" component={MainMenu} />
      <Route path="/classic" component={ClassicEntry} />
      <Route path="/classic/single" component={ClassicSingleOptions} />
      <Route path="/classic/single/play" component={ClassicSinglePlay} />
      <Route path="/classic/local" component={ClassicLocalPlay} />
      <Route path="/adventure" component={AdventureEntry} />
      <Route path="*" component={() => <Navigate href="/" />} />
    </Router>
  );
}
