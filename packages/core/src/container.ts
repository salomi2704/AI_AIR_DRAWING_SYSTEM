export type Constructor<T = unknown> = new (...args: unknown[]) => T;
export type Factory<T = unknown> = (...args: unknown[]) => T;

export interface ServiceDefinition<T = unknown> {
  factory: Factory<T>;
  singleton?: boolean;
}

export class Container {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, unknown> = new Map();

  register<T>(name: string, definition: ServiceDefinition<T>): void {
    this.services.set(name, definition as ServiceDefinition);
  }

  registerSingleton<T>(name: string, factory: Factory<T>): void {
    this.register(name, { factory, singleton: true });
  }

  registerInstance<T>(name: string, instance: T): void {
    this.instances.set(name, instance);
  }

  resolve<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (definition.singleton) {
      if (!this.instances.has(name)) {
        this.instances.set(name, definition.factory());
      }
      return this.instances.get(name) as T;
    }

    return definition.factory() as T;
  }

  has(name: string): boolean {
    return this.services.has(name) || this.instances.has(name);
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }
}

export const container = new Container();