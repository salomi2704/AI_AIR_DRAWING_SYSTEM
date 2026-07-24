import { MemoryBenchmarkRunner } from '../src/runner';

describe('MemoryBenchmarkRunner', () => {
  let runner: MemoryBenchmarkRunner;

  beforeEach(() => {
    runner = new MemoryBenchmarkRunner();
  });

  it('should create runner', () => {
    expect(runner).toBeDefined();
  });

  it('should run benchmark', () => {
    const result = runner.run('test-op', () => { Math.random(); }, 10);
    expect(result.name).toBe('test-op');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  it('should run with default iterations', () => {
    const result = runner.run('default', () => {});
    expect(result.opsPerSecond).toBeGreaterThan(0);
  });

  it('should run suite', () => {
    const suite = runner.runSuite('my-suite', [
      { name: 'add', fn: () => { 1 + 1; } },
      { name: 'mul', fn: () => { 1 * 1; } },
    ]);
    expect(suite.name).toBe('my-suite');
    expect(suite.results).toHaveLength(2);
    expect(suite.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should run suite with custom iterations', () => {
    const suite = runner.runSuite('custom', [
      { name: 'fast', fn: () => {}, iterations: 5 },
    ]);
    expect(suite.results[0]?.name).toBe('custom/fast');
  });

  it('should track history', () => {
    runner.run('a', () => {});
    runner.run('b', () => {});
    expect(runner.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    runner.run('a', () => {});
    runner.clearHistory();
    expect(runner.getHistory()).toHaveLength(0);
  });

  it('should cap history', () => {
    for (let i = 0; i < 110; i++) {
      runner.run(`op-${i}`, () => {});
    }
    expect(runner.getHistory()).toHaveLength(100);
  });
});