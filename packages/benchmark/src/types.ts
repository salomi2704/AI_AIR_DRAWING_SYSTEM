export interface BenchmarkResult {
  name: string;
  durationMs: number;
  opsPerSecond: number;
  memoryUsageMB: number;
  timestamp: number;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDurationMs: number;
}

export interface BenchmarkRunner {
  run(name: string, fn: () => void, iterations?: number): BenchmarkResult;
  runSuite(suiteName: string, tests: Array<{ name: string; fn: () => void; iterations?: number }>): BenchmarkSuite;
  getHistory(): BenchmarkResult[];
  clearHistory(): void;
}