# AI Air Drawing - Core Package

## Overview

The **Core Package** provides the shared utilities and configuration infrastructure for the AI Air Drawing System. This foundational package establishes the common patterns, services, and abstractions that all other packages depend upon.

## Features

### Dependency Injection
- Unified DI container
- Service registration and lifecycle management
- Type-safe dependency resolution
- Singleton and scoped injection

### Configuration Management
- Environment-based configuration
- Type-safe configuration validation
- Hot-reload capabilities
- Secret management and encryption

### Event System
- Event emitter for internal communication
- Event subscription and filtering
- Async event handling
- Event middleware support

### Logging
- Structured logging with Pino
- Multiple log levels
- Log level filtering
- Structured metadata

### Database Integration
- TypeORM integration
- Database configuration
- Connection pooling
- Migration management

### Validation
- Class-based validation
- Cross-field validation
- Custom validation rules
- Validation error reporting

## Quick Start

```bash
npm install @ai-air-drawing/core
```

```typescript
import { Container, Config } from '@ai-air-drawing/core';

// Initialize container
const container = new Container();

// Register services
container.register('Config', Config, { useValue: {} });

// Resolve services
const config = container.resolve('Config');
```

## API Reference

### Configuration

```typescript
interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  port: number;
  database: DatabaseConfig;
  logging: LoggingConfig;
}

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
}

interface LoggingConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'pretty';
}
```

### Event System

```typescript
import { EventEmitter } from '@ai-air-drawing/core';

const emitter = new EventEmitter();

// Subscribe to events
emitter.on('user:created', (user: User) => {
  console.log(`User created: ${user.name}`);
});

// Emit events
emitter.emit('user:created', { id: '123', name: 'John Doe' });
```

### Dependency Injection

```typescript
import { Container, injectable } from '@ai-air-drawing/core';

@injectable()
class UserService {
  async getUsers(): Promise<User[]> {
    // Implementation
  }
}

const container = new Container();
container.register('UserService', UserService);

const userService = container.resolve<UserService>('UserService');
```

## Configuration

### Environment Variables

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_DATABASE=ai_air_drawing
LOG_LEVEL=debug
```

### TypeScript Configuration

```typescript
const config: AppConfig = {
  environment: 'development',
  port: 3000,
  database: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'secret',
    database: 'ai_air_drawing',
    synchronize: true
  },
  logging: {
    level: 'debug',
    format: 'pretty'
  }
};
```

## Usage Examples

### Basic Usage

```typescript
// Import utilities
import { Container, Config, EventEmitter } from '@ai-air-drawing/core';

// Create container
const container = new Container();

// Configure environment
process.env.NODE_ENV = 'development';

// Get configuration
const config = new Config();
container.register('Config', Config, { useValue: config });

// Setup logging
const logger = container.resolve('Logger');

// Initialize services
container.register('EventEmitter', EventEmitter, { useClass: EventEmitter });

console.log('Core services initialized');
```

### Configuration Validation

```typescript
import { Config, ValidationError } from '@ai-air-drawing/core';

class AppConfig {
  port: number;
  database: DatabaseConfig;
  logging: LoggingConfig;

  constructor(config: Partial<AppConfig>) {
    this.port = config.port || 3000;
    this.database = config.database || {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'ai_air_drawing',
      synchronize: true
    };
    this.logging = config.logging || {
      level: 'info',
      format: 'json'
    };

    this.validate();
  }

  validate(): void {
    if (this.port < 0 || this.port > 65535) {
      throw new ValidationError('Port must be between 0 and 65535');
    }
  }
}
```

## Testing

### Unit Tests

```typescript
import { Container, Config } from '@ai-air-drawing/core';
import { ConfigError } from '../errors/ConfigError';

describe('Config', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.register('Config', Config, { useValue: {} });
  });

  describe('constructor', () => {
    it('should create config', () => {
      const config = container.resolve('Config');
      expect(config).toBeDefined();
    });
  });
});
```

## Performance

### Benchmarks

| Operation | Latency | Memory | Throughput |
|-----------|---------|--------|------------|
| Container instantiation | <1ms | <10KB | >10000/s |
| Service resolution | <0.5ms | <5KB | >50000/s |
| Event emission | <0.1ms | <1KB | >100000/s |
| Configuration load | <2ms | <20KB | >5000/s |

## Migration Guide

### From v0.x to v1.0

1. Update imports:
   ```typescript
   // Old
   import { Config as OldConfig } from '@ai-air-drawing/core';

   // New
   import { Config } from '@ai-air-drawing/core';
   ```

2. Type-safe dependency injection:
   ```typescript
   container.register('MyService', MyService);

   // Instead of
   container.register('MyService', MyService, { useValue: new MyService() });
   ```

3. Event system:
   ```typescript
   // Old
   emitter.addListener('event', handler);

   // New
   emitter.on('event', handler);
   ```

## FAQs

### What is the Core package used for?

The Core package provides the fundamental utilities and infrastructure that all other packages in the AI Air Drawing System depend upon. It includes dependency injection, configuration management, event systems, logging, and database integration.

### Is the Core package required?

Yes, all packages in the AI Air Drawing System depend on the Core package for shared utilities and infrastructure.

### What license is used?

The Core package is licensed under MIT.

### How do I contribute?

Please refer to the CONTRIBUTING.md file in the repository root for contribution guidelines.

## Package Dependencies

This package depends on:

- **Runtime Dependencies**: Lodash, UUID, Events, Pino, dotenv, TypeORM, class-validator, class-transformer, reflect-metadata
- **Development Dependencies**: TypeScript, ESLint, Prettier, Jest, Husky, Semantic Release

## Changelog

See CHANGELOG.md for version history and release notes.

## Support

For support and issues, please visit the GitHub repository.

---

*This package is part of the AI Air Drawing System - Modular AI-Powered Drawing Platform*
