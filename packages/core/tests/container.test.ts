import { Container } from '../src/container';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('should register and resolve services', () => {
    container.register('test', { factory: () => ({ value: 42 }) });

    const service = container.resolve<{ value: number }>('test');
    expect(service.value).toBe(42);
  });

  it('should register singleton services', () => {
    container.registerSingleton('test', () => ({ value: Math.random() }));

    const service1 = container.resolve<{ value: number }>('test');
    const service2 = container.resolve<{ value: number }>('test');

    expect(service1.value).toBe(service2.value);
  });

  it('should register instances', () => {
    const instance = { value: 42 };
    container.registerInstance('test', instance);

    const resolved = container.resolve<{ value: number }>('test');
    expect(resolved).toBe(instance);
  });

  it('should throw for unregistered services', () => {
    expect(() => container.resolve('nonexistent')).toThrow("Service 'nonexistent' not registered");
  });

  it('should check if service exists', () => {
    container.register('test', { factory: () => ({}) });

    expect(container.has('test')).toBe(true);
    expect(container.has('nonexistent')).toBe(false);
  });

  it('should clear all services', () => {
    container.register('test', { factory: () => ({}) });
    container.clear();

    expect(container.has('test')).toBe(false);
  });
});