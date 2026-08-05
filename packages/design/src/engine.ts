import { DesignComponent, DesignEngine, DesignSystem } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'DesignEngine' });

let systemCounter = 0;
let componentCounter = 0;

export class MemoryDesignEngine implements DesignEngine {
  private systems: Map<string, DesignSystem> = new Map();

  static resetCounters(): void {
    systemCounter = 0;
    componentCounter = 0;
  }

  createSystem(name: string): DesignSystem {
    systemCounter++;
    const system: DesignSystem = {
      name,
      components: [],
      colors: { primary: '#007AFF', secondary: '#5856D6', background: '#FFFFFF', text: '#000000' },
      fonts: ['Inter', 'SF Pro Display'],
    };
    this.systems.set(`design-${systemCounter}`, system);
    logger.info(`Created design system: ${name}`);
    return system;
  }

  addComponent(
    systemId: string,
    type: DesignComponent['type'],
    properties?: Record<string, string>,
  ): DesignComponent {
    const system = this.systems.get(systemId);
    if (!system) {
      throw new Error(`Design system ${systemId} not found`);
    }

    componentCounter++;
    const component: DesignComponent = {
      id: `comp-${componentCounter}`,
      type,
      properties: properties ?? {},
      children: [],
    };
    system.components.push(component);
    return component;
  }

  getSystem(systemId: string): DesignSystem | undefined {
    return this.systems.get(systemId);
  }

  listSystems(): DesignSystem[] {
    return Array.from(this.systems.values());
  }

  deleteSystem(systemId: string): void {
    this.systems.delete(systemId);
  }
}