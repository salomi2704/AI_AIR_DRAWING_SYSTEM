import { MemoryMathSolver } from '../src/solver';

describe('MemoryMathSolver', () => {
  let solver: MemoryMathSolver;

  beforeEach(() => {
    solver = new MemoryMathSolver();
  });

  it('should create solver', () => {
    expect(solver).toBeDefined();
  });

  it('should solve addition', () => {
    const result = solver.solve('2 + 3');
    expect(result.result).toBe(5);
    expect(result.operation).toBe('add');
  });

  it('should solve subtraction', () => {
    const result = solver.solve('10 - 4');
    expect(result.result).toBe(6);
    expect(result.operation).toBe('subtract');
  });

  it('should solve multiplication', () => {
    const result = solver.solve('3 * 7');
    expect(result.result).toBe(21);
    expect(result.operation).toBe('multiply');
  });

  it('should solve division', () => {
    const result = solver.solve('10 / 2');
    expect(result.result).toBe(5);
    expect(result.operation).toBe('divide');
  });

  it('should handle division by zero', () => {
    const result = solver.solve('5 / 0');
    expect(result.result).toBe(Infinity);
  });

  it('should solve power', () => {
    const result = solver.solve('2 ^ 3');
    expect(result.result).toBe(8);
    expect(result.operation).toBe('power');
  });

  it('should solve sqrt', () => {
    const result = solver.solve('sqrt(9)');
    expect(result.result).toBe(3);
    expect(result.operation).toBe('sqrt');
  });

  it('should solve sin', () => {
    const result = solver.solve('sin(0)');
    expect(result.result).toBe(0);
    expect(result.operation).toBe('sin');
  });

  it('should solve cos', () => {
    const result = solver.solve('cos(0)');
    expect(result.result).toBe(1);
    expect(result.operation).toBe('cos');
  });

  it('should solve tan', () => {
    const result = solver.solve('tan(0)');
    expect(result.result).toBe(0);
    expect(result.operation).toBe('tan');
  });

  it('should solve log', () => {
    const result = solver.solve('log(100)');
    expect(result.result).toBe(2);
    expect(result.operation).toBe('log');
  });

  it('should solve ln', () => {
    const result = solver.solve('ln(1)');
    expect(result.result).toBe(0);
    expect(result.operation).toBe('ln');
  });

  it('should solve pi', () => {
    const result = solver.solve('pi');
    expect(result.result).toBe(Math.PI);
    expect(result.operation).toBe('pi');
  });

  it('should solve e', () => {
    const result = solver.solve('e');
    expect(result.result).toBe(Math.E);
    expect(result.operation).toBe('e');
  });

  it('should return unknown for invalid expression', () => {
    const result = solver.solve('xyz');
    expect(result.operation).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('should track history', () => {
    solver.solve('2 + 3');
    solver.solve('4 * 5');
    expect(solver.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    solver.solve('2 + 3');
    solver.clearHistory();
    expect(solver.getHistory()).toHaveLength(0);
  });

  it('should generate latex for add', () => {
    const result = solver.solve('2 + 3');
    expect(result.latex).toContain('+');
  });

  it('should generate latex for divide', () => {
    const result = solver.solve('10 / 2');
    expect(result.latex).toContain('frac');
  });

  it('should cap history at max', () => {
    for (let i = 0; i < 110; i++) {
      solver.solve('1 + 1');
    }
    expect(solver.getHistory()).toHaveLength(100);
  });
});