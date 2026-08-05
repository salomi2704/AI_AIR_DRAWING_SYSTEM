export type DesignElementType = 'button' | 'card' | 'input' | 'modal' | 'nav' | 'hero' | 'form' | 'table';

export interface DesignComponent {
  id: string;
  type: DesignElementType;
  properties: Record<string, string>;
  children: DesignComponent[];
}

export interface DesignSystem {
  name: string;
  components: DesignComponent[];
  colors: Record<string, string>;
  fonts: string[];
}

export interface DesignEngine {
  createSystem(name: string): DesignSystem;
  addComponent(systemId: string, type: DesignElementType, properties?: Record<string, string>): DesignComponent;
  getSystem(systemId: string): DesignSystem | undefined;
  listSystems(): DesignSystem[];
  deleteSystem(systemId: string): void;
}