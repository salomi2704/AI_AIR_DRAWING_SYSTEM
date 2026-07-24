import { EventBus } from '../src/events';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should emit and receive events', async () => {
    const handler = jest.fn();
    bus.on('test', handler);

    await bus.emit('test', { value: 42 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test',
        data: { value: 42 },
      })
    );
  });

  it('should unsubscribe from events', async () => {
    const handler = jest.fn();
    const unsubscribe = bus.on('test', handler);

    unsubscribe();
    await bus.emit('test', { value: 42 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    bus.on('test', handler1);
    bus.on('test', handler2);

    await bus.emit('test', { value: 42 });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove all listeners', async () => {
    const handler = jest.fn();
    bus.on('test', handler);
    bus.on('other', handler);

    bus.removeAllListeners('test');
    await bus.emit('test', { value: 42 });

    expect(handler).not.toHaveBeenCalled();
  });
});