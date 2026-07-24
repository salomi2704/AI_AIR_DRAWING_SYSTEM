export type DiagramType = 'class' | 'sequence' | 'er' | 'flowchart' | 'component' | 'deployment';

export interface SEClass {
  name: string;
  attributes: string[];
  methods: string[];
}

export interface SESequenceMessage {
  from: string;
  to: string;
  label: string;
  type: 'sync' | 'async' | 'return';
}

export interface SEDiagram {
  type: DiagramType;
  classes: SEClass[];
  messages: SESequenceMessage[];
}

export interface SEDiagramGenerator {
  generateClassDiagram(text: string): SEDiagram;
  generateSequenceDiagram(text: string): SEDiagram;
  getHistory(): SEDiagram[];
  clearHistory(): void;
}