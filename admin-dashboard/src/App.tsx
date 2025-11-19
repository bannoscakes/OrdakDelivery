import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { DeliveryRuns } from './pages/DeliveryRuns';
import { CreateDeliveryRun } from './pages/CreateDeliveryRun';
import { DeliveryRunDetail } from './pages/DeliveryRunDetail';
import { Orders } from './pages/Orders';
import { Drivers } from './pages/Drivers';
import { Vehicles } from './pages/Vehicles';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="runs" element={<DeliveryRuns />} />
            <Route path="runs/create" element={<CreateDeliveryRun />} />
            <Route path="runs/:id" element={<DeliveryRunDetail />} />
            <Route path="orders" element={<Orders />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="vehicles" element={<Vehicles />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
