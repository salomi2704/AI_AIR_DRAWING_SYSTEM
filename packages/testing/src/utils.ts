import { TestUtils, BenchmarkResult } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'TestUtils' });

export class MemoryTestUtils implements TestUtils {
  createMockData<T>(template: T): T {
    return JSON.parse(JSON.stringify(template));
  }

  async waitFor(condition: () => boolean, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async measureTime(fn: () => Promise<void>): Promise<number> {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  }

  async benchmark(name: string, fn: () => Promise<void>, iterations: number = 100): Promise<BenchmarkResult> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      times.push(Date.now() - start);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const opsPerSecond = 1000 / averageTime;

    logger.info(`Benchmark ${name}: ${opsPerSecond.toFixed(2)} ops/s`);

    return {
      name,
      opsPerSecond,
      averageTime,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      samples: iterations,
    };
  }
}