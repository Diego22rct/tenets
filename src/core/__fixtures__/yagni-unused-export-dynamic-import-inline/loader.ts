export async function loadLayout() {
  return (await import('./layout.module.js')).AppLayoutModule;
}
