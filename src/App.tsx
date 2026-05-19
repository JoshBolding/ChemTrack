import { Analytics } from '@vercel/analytics/react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './screens/Home';
import ScanTote from './screens/ScanTote';
import ToteDetail from './screens/ToteDetail';
import AssignToUnit from './screens/AssignToUnit';
import RecordUsage from './screens/RecordUsage';
import ReturnToYard from './screens/ReturnToYard';
import MarkEmpty from './screens/MarkEmpty';
import DiscardTote from './screens/DiscardTote';
import ChangeJob from './screens/ChangeJob';
import Inventory from './screens/Inventory';
import InventoryTotes from './screens/InventoryTotes';
import Units from './screens/Units';
import UnitDetail from './screens/UnitDetail';
import Jobs from './screens/Jobs';
import ReceiveShipment from './screens/ReceiveShipment';
import ToteSearch from './screens/ToteSearch';
import ToteNotFound from './screens/ToteNotFound';
import More from './screens/More';
import NeedsAttention from './screens/NeedsAttention';
import AddNote from './screens/AddNote';
import Supervisor from './screens/Supervisor';

function analyticsPath(pathname: string) {
  if (pathname === '/tote/not-found') return pathname;
  if (pathname.startsWith('/tote/')) {
    const [, , , action] = pathname.split('/');
    return action ? `/tote/:id/${action}` : '/tote/:id';
  }
  if (pathname.startsWith('/units/')) return '/units/:id';

  return pathname;
}

function VercelAnalytics() {
  const location = useLocation();
  const path = analyticsPath(location.pathname);

  return <Analytics route={path} path={path} />;
}

export default function App() {
  return (
    <HashRouter>
      <VercelAnalytics />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanTote />} />
        <Route path="/search" element={<ToteSearch />} />
        <Route path="/tote/not-found" element={<ToteNotFound />} />
        <Route path="/tote/:id" element={<ToteDetail />} />
        <Route path="/tote/:id/assign" element={<AssignToUnit />} />
        <Route path="/tote/:id/usage" element={<RecordUsage />} />
        <Route path="/tote/:id/return" element={<ReturnToYard />} />
        <Route path="/tote/:id/empty" element={<MarkEmpty />} />
        <Route path="/tote/:id/discard" element={<DiscardTote />} />
        <Route path="/tote/:id/job" element={<ChangeJob />} />
        <Route path="/tote/:id/note" element={<AddNote />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/totes" element={<InventoryTotes />} />
        <Route path="/units" element={<Units />} />
        <Route path="/units/:id" element={<UnitDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/receive" element={<ReceiveShipment />} />
        <Route path="/more" element={<More />} />
        <Route path="/attention" element={<NeedsAttention />} />
        <Route path="/reports" element={<Supervisor />} />
      </Routes>
    </HashRouter>
  );
}
