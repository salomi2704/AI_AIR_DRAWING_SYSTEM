import { BenchmarkResult, BenchmarkRunner, BenchmarkSuite } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'BenchmarkRunner' });

export class MemoryBenchmarkRunner implements BenchmarkRunner {
  private history: BenchmarkResult[] = [];
  private maxHistory: number = 100;

  run(name: string, fn: () => void, iterations: number = 100): BenchmarkResult {
    const memBefore = process.memoryUsage().heapUsed;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const durationMs = performance.now() - start;
    const memAfter = process.memoryUsage().heapUsed;
    const opsPerSecond = iterations / (durationMs / 1000);

    const result: BenchmarkResult = {
      name,
      durationMs,
      opsPerSecond,
      memoryUsageMB: (memAfter - memBefore) / (1024 * 1024),
      timestamp: Date.now(),
    };

    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Benchmark "${name}": ${opsPerSecond.toFixed(0)} ops/s in ${durationMs.toFixed(2)}ms`);
    return result;
  }

  runSuite(
    suiteName: string,
    tests: Array<{ name: string; fn: () => void; iterations?: number }>,
  ): BenchmarkSuite {
    const results: BenchmarkResult[] = [];
    const suiteStart = performance.now();

    for (const test of tests) {
      results.push(this.run(`${suiteName}/${test.name}`, test.fn, test.iterations));
    }

    const totalDurationMs = performance.now() - suiteStart;
    logger.info(`Suite "${suiteName}" completed in ${totalDurationMs.toFixed(2)}ms`);

    return { name: suiteName, results, totalDurationMs };
  }

  getHistory(): BenchmarkResult[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}