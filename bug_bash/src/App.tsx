import React from 'react';
import AppLayout from './layout/layout';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import FetchQualifiedSegments from './pages/fetch-qualified-segments/fetch-qualified-segments';

const router = createBrowserRouter([
  {
    path: '/',
    element: <FetchQualifiedSegments />,
  },
]);

const App = () => {
  return (
    <AppLayout>
      <RouterProvider router={router} />
    </AppLayout>
  );
};

export default App;
