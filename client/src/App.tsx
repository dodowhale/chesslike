import { lazy } from 'solid-js';
import { Navigate, Route, HashRouter } from '@solidjs/router';

const MainMenu = lazy(() => import('@/routes/MainMenu'));
const ClassicEntry = lazy(() => import('@/routes/ClassicEntry'));
const ClassicSingleOptions = lazy(() => import('@/routes/ClassicSingleOptions'));
const ClassicSinglePlay = lazy(() => import('@/routes/ClassicSinglePlay'));
const ClassicLocalOptions = lazy(() => import('@/routes/ClassicLocalOptions'));
const ClassicLocalPlay = lazy(() => import('@/routes/ClassicLocalPlay'));
const AdventureEntry = lazy(() => import('@/routes/AdventureEntry'));
const AdventureMap = lazy(() => import('@/routes/AdventureMap'));
const AdventureBattle = lazy(() => import('@/routes/AdventureBattle'));
const AdventureShop = lazy(() => import('@/routes/AdventureShop'));
const AdventureEvent = lazy(() => import('@/routes/AdventureEvent'));
const AdventureRest = lazy(() => import('@/routes/AdventureRest'));
const AdventureBoss = lazy(() => import('@/routes/AdventureBoss'));
const AdventureInventory = lazy(() => import('@/routes/AdventureInventory'));
const AdventureResult = lazy(() => import('@/routes/AdventureResult'));
const MetaProgress = lazy(() => import('@/routes/MetaProgress'));
const Achievements = lazy(() => import('@/routes/Achievements'));
const Stats = lazy(() => import('@/routes/Stats'));
const Help = lazy(() => import('@/routes/Help'));

export default function App() {
  return (
    <HashRouter>
      <Route path="/" component={MainMenu} />
      <Route path="/classic" component={ClassicEntry} />
      <Route path="/classic/single" component={ClassicSingleOptions} />
      <Route path="/classic/single/play" component={ClassicSinglePlay} />
      <Route path="/classic/local" component={ClassicLocalOptions} />
      <Route path="/classic/local/play" component={ClassicLocalPlay} />
      <Route path="/adventure" component={AdventureEntry} />
      <Route path="/adventure/run/map" component={AdventureMap} />
      <Route path="/adventure/run/battle" component={AdventureBattle} />
      <Route path="/adventure/run/shop" component={AdventureShop} />
      <Route path="/adventure/run/event" component={AdventureEvent} />
      <Route path="/adventure/run/rest" component={AdventureRest} />
      <Route path="/adventure/run/boss" component={AdventureBoss} />
      <Route path="/adventure/run/inventory" component={AdventureInventory} />
      <Route path="/adventure/run/result" component={AdventureResult} />
      <Route path="/meta" component={MetaProgress} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/stats" component={Stats} />
      <Route path="/help" component={Help} />
      <Route path="*" component={() => <Navigate href="/" />} />
    </HashRouter>
  );
}
