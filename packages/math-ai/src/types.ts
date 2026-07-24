export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'sin' | 'cos' | 'tan' | 'log' | 'ln' | 'pi' | 'e' | 'unknown';

export interface MathExpression {
  operation: MathOperation;
  operands: number[];
  result: number;
  latex: string;
  confidence: number;
}

export interface MathSolver {
  solve(expression: string): MathExpression;
  getHistory(): MathExpression[];
  clearHistory(): void;
}