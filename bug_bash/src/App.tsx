import React from 'react';
import AppLayout from './layout/layout';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import FetchQualifiedSegments from './pages/fetch-qualified-segments/fetch-qualified-segments';
import ValidateUserContext from './pages/validate-user-context/validate-user-context';

const router = createBrowserRouter([
  {
    path: '/fetch-qualified-segments',
    element: <FetchQualifiedSegments />,
  },
  {
    path: '/',
    element: <ValidateUserContext />,
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
