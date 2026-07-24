# AI Air Drawing - Testing Package

## Overview

The **Testing Package** provides comprehensive testing frameworks, test automation, and quality assurance for the AI Air Drawing System. This package includes unit tests, integration tests, performance tests, and end-to-end tests to ensure the reliability, quality, and maintainability of all other packages.

## Features

### Test Frameworks
- **Unit Testing**: Jest with TypeScript support
- **Integration Testing**: Cross-package and system integration tests
- **End-to-End Testing**: Cypress for UI testing
- **Performance Testing**: Custom benchmarks and performance tests
- **Accessibility Testing**: Automated accessibility testing

### Test Coverage
- **Code Coverage**: Jest code coverage reporting
- **Test Results**: HTML, JSON, and JUnit test result reports
- **Visual Testing**: Screenshots and visual regression tests
- **API Testing**: HTTP request/response validation
- **Component Testing**: Isolated component testing

## Quick Start

```bash
npm install @ai-air-drawing/testing
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run accessibility tests
npm run test:accessibility

# Run all tests with coverage
npm run test:all

# Generate coverage report
npm run test:coverage

# Generate test report
npm run test:report
```

## API Reference

### Test Framework

```typescript
import { TestRunner, TestSuite, Test } from '@ai-air-drawing/testing';

@TestSuite('Core Package Tests')
class CorePackageTests {
  @Test('should initialize container')
  async testContainerInitialization(): Promise<void> {
    const container = new Container();
    expect(container).toBeDefined();
  }
}
```

### Test Fixtures

```typescript
import { TestFixture } from '@ai-air-drawing/testing';

@TestFixture
class TestFixtures {
  private container = new Container();

  @BeforeEach()
  async setup(): Promise<void> {
    this.container = new Container();
  }

  @AfterEach()
  async teardown(): Promise<void> {
    await this.container.clear();
  }

  getContainer(): Container {
    return this.container;
  }
}
```

## Usage Examples

### Unit Test Example

```typescript
import { Test, TestSuite } from '@ai-air-drawing/testing';
import { Container } from '@ai-air-drawing/core';

@TestSuite('Container Tests')
class ContainerTests {
  @Test('should create container instance')
  async testContainerCreation(): Promise<void> {
    const container = new Container();
    expect(container).toBeDefined();
    expect(container).toBeInstanceOf(Container);
  }

  @Test('should resolve dependency')
  async testDependencyResolution(): Promise<void> {
    const container = new Container();
    container.register('Config', Config, { useValue: {} });

    const config = container.resolve('Config');
    expect(config).toBeDefined();
    expect(config).toBeInstanceOf(Config);
  }

  @Test('should throw error when dependency not registered')
  async testDependencyNotFound(): Promise<void> {
    const container = new Container();

    expect(() => container.resolve('NonExistent')).toThrow(Error);
  }
}
```

## Testing Strategies

### Unit Testing
- **Isolated Testing**: Each unit test should be independent
- **Double-Unit Testing**: Test units in isolation and together
- **Edge Case Testing**: Test boundary conditions and edge cases
- **Error Testing**: Test error scenarios and exception handling
- **Mock Testing**: Mock external dependencies for testing

### Integration Testing
- **Contract Testing**: Test service contracts and interfaces
- **Data Testing**: Test database interactions and data consistency
- **Component Testing**: Test component integration and communication
- **End-to-End Testing**: Test complete workflows and user journeys

### Performance Testing
- **Load Testing**: Test system performance under load
- **Stress Testing**: Test system limits and failure modes
- **Soak Testing**: Test system performance over extended periods
- **Spike Testing**: Test system response to sudden load changes

## Test Structure

### Test Organization
```
tests/
├── unit/                    # Unit tests
│   ├── core/              # Core package tests
│   ├── models/           # Models package tests
│   ├── inference/        # Inference package tests
│   ├── storage/          # Storage package tests
│   └── auth/            # Auth package tests
├── integration/              # Integration tests
│   ├── cross-package/     # Cross-package integration
│   ├── system/            # System integration
│   └── workflow/          # Workflow integration
├── performance/              # Performance tests
│   ├── benchmarks/        # Benchmark tests
│   ├── load/             # Load testing
│   └── stress/           # Stress testing
├── e2e/                     # End-to-end tests
│   ├── ui/              # UI tests
│   ├── api/             # API tests
│   └── workflow/        # Workflow tests
├── fixtures/                # Test fixtures
├── utils/                   # Test utilities
└── config/                  # Test configuration
```

## Test Commands

### Local Testing
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run accessibility tests
npm run test:accessibility

# Run end-to-end tests
npm run test:e2e

# Run all tests with coverage
npm run test:all

# Generate coverage report
npm run test:coverage

# Generate test report
npm run test:report
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run lint
      run: npm run lint:check

    - name: Type check
      run: npm run typecheck

    - name: Run tests
      run: npm run test:all

    - name: Generate coverage
      run: npm run test:coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
```

## Test Quality

- **Coverage**: Aim for high test coverage
- **Accuracy**: Tests should accurately test functionality
- **Performance**: Tests should not be slow or resource-intensive
- **Readability**: Tests should be easy to read and understand

## Package Dependencies

This package depends on:

- **Runtime Dependencies**: jest, jest-html-reporters, jest-junit, jest-json-report, supertest, cross-fetch, node-fetch, rimraf, uuid, dotenv, promises, async, yargs, c8, nyc
- **Development Dependencies**: @types/node, @types/jest, @types/yargs, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, eslint, eslint-config-prettier, eslint-plugin-prettier, prettier, rimraf, typescript, ts-jest, husky, lint-staged, semantic-release

## Support

For support and issues, please visit the GitHub repository.

---

*This package is part of the AI Air Drawing System - Modular AI-Powered Drawing Platform*
