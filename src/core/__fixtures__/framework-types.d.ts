declare module '@angular/core' {
  export function Component(options: any): any;
  export function Directive(options?: any): any;
  export function Pipe(options?: any): any;
  export function Injectable(options?: any): any;
  export function NgModule(options?: any): any;
}

declare module '@angular/forms' {
  export class FormControl {
    constructor(val?: any);
  }
  export class FormGroup {
    constructor(controls?: any);
  }
}

declare module '@angular/platform-browser' {
  export function bootstrapApplication(app: any, config?: any): any;
}

declare module 'rxjs' {
  export class BehaviorSubject<T> {
    constructor(val: T);
  }
}

declare module '@nestjs/common' {
  export function Controller(prefix?: string): any;
  export function Module(metadata: any): any;
  export function Injectable(): any;
  export function Get(path?: string): any;
  export function Post(path?: string): any;
  export function Put(path?: string): any;
  export function Delete(path?: string): any;
  export function Patch(path?: string): any;
  export class NotFoundException {
    constructor(msg?: string);
  }
  export class BadRequestException {
    constructor(msg?: string);
  }
}

declare module '@nestjs/core' {
  export class NestFactory {
    static create(module: any): Promise<any>;
  }
}

declare module 'hono' {
  export class Hono<E = any> {
    get(path: string, ...handlers: any[]): this;
    post(path: string, ...handlers: any[]): this;
    put(path: string, ...handlers: any[]): this;
    delete(path: string, ...handlers: any[]): this;
    patch(path: string, ...handlers: any[]): this;
    all(path: string, ...handlers: any[]): this;
    on(method: string, path: string, ...handlers: any[]): this;
    use(path: string, ...handlers: any[]): this;
    route(path: string, app: any): this;
    basePath(path: string): this;
    fetch(request: Request, env?: any, executionCtx?: any): Response | Promise<Response>;
  }
}

declare module 'hono/factory' {
  export function createMiddleware(middleware: any): any;
  export function createFactory<E = any>(): {
    createApp(): any;
    createMiddleware(middleware: any): any;
    createHandlers(...handlers: any[]): any[];
  };
}

declare module 'hono/http-exception' {
  export class HTTPException extends Error {
    constructor(status?: number, options?: { message?: string; res?: Response; cause?: any });
    getResponse(): Response;
  }
}

declare module '@hono/zod-openapi' {
  export class OpenAPIHono<E = any> {
    openapi(route: any, handler: any): this;
    doc(path: string, spec: any): this;
  }
  export function createRoute(config: any): any;
}

