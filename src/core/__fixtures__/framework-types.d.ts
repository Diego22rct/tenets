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
