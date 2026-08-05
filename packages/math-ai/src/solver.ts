import { MathExpression, MathSolver } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'MathSolver' });

export class MemoryMathSolver implements MathSolver {
  private history: MathExpression[] = [];
  private maxHistory: number = 100;

  solve(expression: string): MathExpression {
    const result = this.evaluate(expression);
    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    logger.debug(`Solved: ${expression} = ${result.result}`);
    return result;
  }

  getHistory(): MathExpression[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Math history cleared');
  }

  private evaluate(expr: string): MathExpression {
    const trimmed = expr.trim();

    // Simple addition: a + b
    const addMatch = trimmed.match(/^(\d+\.?\d*)\s*\+\s*(\d+\.?\d*)$/);
    if (addMatch) {
      const a = parseFloat(addMatch[1] ?? '0');
      const b = parseFloat(addMatch[2] ?? '0');
      return { operation: 'add', operands: [a, b], result: a + b, latex: `${a} + ${b}`, confidence: 0.95 };
    }

    // Simple subtraction: a - b
    const subMatch = trimmed.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
    if (subMatch) {
      const a = parseFloat(subMatch[1] ?? '0');
      const b = parseFloat(subMatch[2] ?? '0');
      return { operation: 'subtract', operands: [a, b], result: a - b, latex: `${a} - ${b}`, confidence: 0.95 };
    }

    // Simple multiplication: a * b
    const mulMatch = trimmed.match(/^(\d+\.?\d*)\s*\*\s*(\d+\.?\d*)$/);
    if (mulMatch) {
      const a = parseFloat(mulMatch[1] ?? '0');
      const b = parseFloat(mulMatch[2] ?? '0');
      return { operation: 'multiply', operands: [a, b], result: a * b, latex: `${a} \\times ${b}`, confidence: 0.95 };
    }

    // Simple division: a / b
    const divMatch = trimmed.match(/^(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)$/);
    if (divMatch) {
      const a = parseFloat(divMatch[1] ?? '0');
      const b = parseFloat(divMatch[2] ?? '0');
      if (b === 0) {
        return { operation: 'divide', operands: [a, b], result: Infinity, latex: `${a} / ${b}`, confidence: 0.9 };
      }
      return { operation: 'divide', operands: [a, b], result: a / b, latex: `\\frac{${a}}{${b}}`, confidence: 0.95 };
    }

    // Power: a ^ b
    const powMatch = trimmed.match(/^(\d+\.?\d*)\s*\^\s*(\d+\.?\d*)$/);
    if (powMatch) {
      const a = parseFloat(powMatch[1] ?? '0');
      const b = parseFloat(powMatch[2] ?? '0');
      return { operation: 'power', operands: [a, b], result: Math.pow(a, b), latex: `${a}^{${b}}`, confidence: 0.9 };
    }

    // sqrt(a)
    const sqrtMatch = trimmed.match(/^sqrt\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (sqrtMatch) {
      const a = parseFloat(sqrtMatch[1] ?? '0');
      return { operation: 'sqrt', operands: [a], result: Math.sqrt(a), latex: `\\sqrt{${a}}`, confidence: 0.9 };
    }

    // sin(a)
    const sinMatch = trimmed.match(/^sin\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (sinMatch) {
      const a = parseFloat(sinMatch[1] ?? '0');
      return { operation: 'sin', operands: [a], result: Math.sin(a), latex: `\\sin(${a})`, confidence: 0.85 };
    }

    // cos(a)
    const cosMatch = trimmed.match(/^cos\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (cosMatch) {
      const a = parseFloat(cosMatch[1] ?? '0');
      return { operation: 'cos', operands: [a], result: Math.cos(a), latex: `\\cos(${a})`, confidence: 0.85 };
    }

    // tan(a)
    const tanMatch = trimmed.match(/^tan\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (tanMatch) {
      const a = parseFloat(tanMatch[1] ?? '0');
      return { operation: 'tan', operands: [a], result: Math.tan(a), latex: `\\tan(${a})`, confidence: 0.85 };
    }

    // log(a)
    const logMatch = trimmed.match(/^log\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (logMatch) {
      const a = parseFloat(logMatch[1] ?? '0');
      return { operation: 'log', operands: [a], result: Math.log10(a), latex: `\\log(${a})`, confidence: 0.85 };
    }

    // ln(a)
    const lnMatch = trimmed.match(/^ln\s*\(\s*(\d+\.?\d*)\s*\)$/i);
    if (lnMatch) {
      const a = parseFloat(lnMatch[1] ?? '0');
      return { operation: 'ln', operands: [a], result: Math.log(a), latex: `\\ln(${a})`, confidence: 0.85 };
    }

    // pi
    if (trimmed.toLowerCase() === 'pi') {
      return { operation: 'pi', operands: [], result: Math.PI, latex: '\\pi', confidence: 0.99 };
    }

    // e
    if (trimmed.toLowerCase() === 'e') {
      return { operation: 'e', operands: [], result: Math.E, latex: 'e', confidence: 0.99 };
    }

    return { operation: 'unknown', operands: [], result: 0, latex: trimmed, confidence: 0 };
  }
}