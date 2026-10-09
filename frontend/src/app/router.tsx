import { createBrowserRouter, type RouteObject } from 'react-router';
import { HomePage } from '@/features/inicio/pages/HomePage';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage />, handle: { title: 'Inicio' } },
      { path: '*', element: <NotFoundPage />, handle: { title: 'No encontrada' } },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
