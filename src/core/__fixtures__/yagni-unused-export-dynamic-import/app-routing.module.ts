export const routes = [
  {
    path: '',
    loadChildren: () => import('./layout.module.js').then((m) => m.AppLayoutModule),
  },
];
