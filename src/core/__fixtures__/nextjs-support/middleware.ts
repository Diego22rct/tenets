export function middleware(request: any): any {
  return Response.redirect('https://example.com/login', 302);
}
