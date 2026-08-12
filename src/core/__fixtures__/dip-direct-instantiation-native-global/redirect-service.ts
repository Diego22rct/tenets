export class RedirectService {
  buildUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('state', 'pending');
    return url.toString();
  }
}
