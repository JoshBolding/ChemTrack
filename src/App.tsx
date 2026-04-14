import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './screens/Home';
import ScanTote from './screens/ScanTote';
import ToteDetail from './screens/ToteDetail';
import AssignToUnit from './screens/AssignToUnit';
import TransferToUnit from './screens/TransferToUnit';
import RecordUsage from './screens/RecordUsage';
import ReturnToYard from './screens/ReturnToYard';
import MarkEmpty from './screens/MarkEmpty';
import DiscardTote from './screens/DiscardTote';
import ChangeJob from './screens/ChangeJob';
import Inventory from './screens/Inventory';
import Units from './screens/Units';
import UnitDetail from './screens/UnitDetail';
import Jobs from './screens/Jobs';
import ReceiveShipment from './screens/ReceiveShipment';
import ToteSearch from './screens/ToteSearch';
import ToteNotFound from './screens/ToteNotFound';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanTote />} />
        <Route path="/search" element={<ToteSearch />} />
        <Route path="/tote/not-found" element={<ToteNotFound />} />
        <Route path="/tote/:id" element={<ToteDetail />} />
        <Route path="/tote/:id/assign" element={<AssignToUnit />} />
        <Route path="/tote/:id/transfer" element={<TransferToUnit />} />
        <Route path="/tote/:id/usage" element={<RecordUsage />} />
        <Route path="/tote/:id/return" element={<ReturnToYard />} />
        <Route path="/tote/:id/empty" element={<MarkEmpty />} />
        <Route path="/tote/:id/discard" element={<DiscardTote />} />
        <Route path="/tote/:id/job" element={<ChangeJob />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/units" element={<Units />} />
        <Route path="/units/:id" element={<UnitDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/receive" element={<ReceiveShipment />} />
      </Routes>
    </HashRouter>
  );
}
