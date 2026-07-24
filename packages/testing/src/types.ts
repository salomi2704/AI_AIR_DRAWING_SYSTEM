export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  samples: number;
}

export interface TestUtils {
  createMockData<T>(template: T): T;
  waitFor(condition: () => boolean, timeout?: number): Promise<void>;
  measureTime(fn: () => Promise<void>): Promise<number>;
}