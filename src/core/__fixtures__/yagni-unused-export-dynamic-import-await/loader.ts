export async function loadLayout() {
  const { AppLayoutModule } = await import('./layout.module.js');
  return AppLayoutModule;
}
