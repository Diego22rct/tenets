import { HeroComponent } from './hero.component.js';

export const routes = [
  {
    path: 'hero',
    component: HeroComponent,
  },
  {
    path: 'hero-lazy',
    loadComponent: () => import('./hero.component.js').then((m) => m.HeroComponent),
  },
];
