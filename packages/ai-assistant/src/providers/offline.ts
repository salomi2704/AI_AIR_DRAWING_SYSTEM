import { Provider, SummarizeOptions } from './base';

export interface DiagramShapeLike {
  kind?: string;
  label?: string;
}

export interface DiagramTextLike {
  text?: string;
}

export class RuleProvider implements Provider {
  name = 'offline';

  available(): boolean {
    return true;
  }

  async summarize(_systemPrompt: string, _userPrompt: string, _options?: SummarizeOptions): Promise<string> {
    return '';
  }

  static summarizeDiagram(
    textRegions: DiagramTextLike[],
    shapes: DiagramShapeLike[],
    latex: string[],
  ): string {
    if (shapes.length === 0 && textRegions.length === 0 && latex.length === 0) {
      return 'The canvas is blank: no shapes, text or formulas were recognized.';
    }

    const parts: string[] = [];
    if (shapes.length > 0) {
      const counts = new Map<string, number>();
      for (const shape of shapes) {
        const kind = shape.kind || 'unknown';
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
      }
      const labels = [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, count]) => `${count} ${name}${count !== 1 ? 's' : ''}`);
      parts.push(`Shapes: ${labels.join(', ')}.`);
    }
    if (textRegions.length > 0) {
      parts.push(`Text: ${textRegions.map((region) => region.text ?? '').join('; ')}.`);
    }
    if (latex.length > 0) {
      parts.push(`Formulas: ${latex.join('; ')}.`);
    }
    return parts.join(' ');
  }
}
