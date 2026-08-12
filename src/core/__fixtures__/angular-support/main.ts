import { bootstrapApplication } from '@angular/platform-browser';
import { HeroComponent } from './hero.component.js';
import { routes } from './app.routes.js';

export function bootstrap() {
  return bootstrapApplication(HeroComponent, { providers: [routes] });
}
