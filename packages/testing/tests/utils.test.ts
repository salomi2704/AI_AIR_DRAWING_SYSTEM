import { MemoryTestUtils } from '../src/utils';

describe('MemoryTestUtils', () => {
  let utils: MemoryTestUtils;

  beforeEach(() => {
    utils = new MemoryTestUtils();
  });

  it('should create test utils', () => {
    expect(utils).toBeDefined();
  });

  it('should create mock data', () => {
    const template = { name: 'test', value: 123 };
    const mock = utils.createMockData(template);
    expect(mock).toEqual(template);
    expect(mock).not.toBe(template); // Should be a copy
  });

  it('should wait for condition', async () => {
    let counter = 0;
    setTimeout(() => { counter = 1; }, 50);
    await utils.waitFor(() => counter === 1);
    expect(counter).toBe(1);
  });

  it('should timeout waiting for condition', async () => {
    await expect(utils.waitFor(() => false, 100)).rejects.toThrow('Timeout');
  });

  it('should measure time', async () => {
    const duration = await utils.measureTime(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(duration).toBeGreaterThanOrEqual(40);
  });

  it('should run benchmark', async () => {
    const result = await utils.benchmark('test', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }, 10);

    expect(result.name).toBe('test');
    expect(result.opsPerSecond).toBeGreaterThan(0);
    expect(result.samples).toBe(10);
  });
});