# AI Air Drawing System

A real-time, gesture-based air drawing application built with computer
vision. Draw in the air with your fingertip — pinch to draw with one hand,
close both fists to erase, and use an open palm to drive an on-screen
toolbar. The finished drawing can be run through OCR, shape/formula
recognition and exported to SVG, PNG, PDF and LaTeX.

```
   ✋ hover/UI      🤏 pinch = draw (one hand)      ✊✊ two fists = erase
```

This repository contains **two implementations**:

- **Python reference app** (`app.py`, `tracking/`, `canvas/`, …) — the
  original computer-vision implementation, documented in the sections below.
- **JS/TS monorepo** (`packages/`) — a pnpm workspace port with modular
  packages for vision, hand tracking, gesture/shape recognition, storage,
  AI assist and export. See the [JS/TS Monorepo](#jsts-monorepo) section.

## Features

- **Hand tracking** — MediaPipe Tasks API (`hand_landmarker`) landmark
  detection with automatic model download
- **Gesture classification** — pinch / fist / open palm from landmark
  geometry (rotation-invariant, palm-size normalised)
- **Virtual canvas** — multi-layer stroke recording, point-based erasing,
  undo/redo, colour and brush selection
- **Gesture-controlled toolbar** — colour palette, brush sizes, undo, redo,
  clear, export and recognize, all driven by the hand
- **Recognition** — Tesseract OCR for handwritten text, contour-based shape
  detection (lines, circles, boxes, arrows), flowchart assembly and
  heuristic formula detection
- **AI assist** — snaps rough strokes to clean geometry and converts
  formulas to LaTeX (optional pix2tex backend)
- **Export** — vector SVG, raster PNG, PDF (reportlab) and a compilable
  `.tex` report
- **30 fps target** — tuned for real-time webcam use

## Requirements

- Python 3.10+ (tested on 3.12)
- A webcam
- The **Tesseract OCR binary** for text recognition
  (optional — the app runs without it, OCR is simply skipped)

## Setup

```bash
# 1. Create a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install the Tesseract binary (for OCR)
#    Windows: https://github.com/UB-Mannheim/tesseract/wiki
#    macOS:   brew install tesseract
#    Linux:   sudo apt install tesseract-ocr
#    (set config.TESSERACT_CMD if the binary is not on your PATH)
```

The MediaPipe hand-landmarker model (~8 MB) downloads automatically on first
run into `models/`.

## Usage

```bash
python app.py
```

| Option | Description |
|---|---|
| `--camera SRC` | camera index (default `0`) or path to a video file |
| `--width W --height H` | requested camera resolution (default `1280x720`) |
| `--no-recognize` | skip OCR/shape recognition for faster startup |

The app logs the camera's actual resolution at startup and builds the toolbar
to fit it, so it works with any webcam resolution. A `HAND / NO HAND` badge
next to the toolbar shows whether tracking currently sees you.

Once running, use the gestures below. Full gesture legend and keyboard
shortcuts are in **[GESTURES.md](GESTURES.md)**.

| Gesture | Action |
|---|---|
| Open palm (one hand) | Hover / UI mode — cursor follows your index fingertip |
| Pinch (one hand) | Draw a stroke (hold + move) |
| Pinch over a button (one hand) | Tap — activates the toolbar button |
| Two fists (both hands) | Erase under the second hand's fingertip |

Drawing is single-hand only and erasing requires **both** hands closed, so a
second hand never draws by accident.

**Recognition**: press `r` (or the *Recognize* button) to OCR the drawing,
detect shapes/diagrams and extract formulas. Press `e` (or *Export*) to write
`airdraw_<timestamp>.svg/.png/.pdf/.tex` into `exports/`.

## Architecture

```
app.py                     entry point: camera loop, gesture dispatch,
                           recognition triggers and export wiring
config.py                  every tunable parameter in one place
tracking/                  MediaPipe hand tracking + gesture classification
canvas/                    virtual canvas: layers, strokes, undo/redo, render
ui/                        gesture-controlled toolbar + HUD renderer
recognition/               OCR (pytesseract), shape/diagram detection,
                           formula detection
ai_assist/                 sketch cleanup (snap to geometry), LaTeX converter
export/                    SVG / PNG / PDF / .tex exporters
tests/                     unit tests (no camera required)
```

Data flow:

```
camera frame ─► tracking.HandTracker ─► GestureClassifier
                                            │  pinch / fist / palm
                                            ▼
                     canvas.VirtualCanvas (strokes, layers, undo/redo)
                                            │
                     recognition (OCR + shapes + formulas) ─► ai_assist
                                            │                    │
                                            ▼                    ▼
                          export (SVG / PNG / PDF / TeX)   cleanup + LaTeX
```

Each module is independent and testable on its own — see *Testing*.

## Testing

```bash
python -m unittest discover -s tests
```

Tests use synthetic hand landmarks and synthetic strokes, so no camera or
webcam is required. OCR tests skip automatically when Tesseract is missing.

## Configuration

All tunable parameters live in `config.py`: detection confidence, canvas and
camera resolution, pinch/erase thresholds, colour palette, brush sizes,
export DPI and more. See the comments in that file and the tuning table in
GESTURES.md.

---

# JS/TS Monorepo

## Project Overview

The AI Air Drawing System is a modular platform that enables gesture-based digital drawing, annotation, and AI-assisted diagram recognition. Built on top of a camera and hand-tracking foundation, the system supports the following capabilities:

- **Air Drawing**: Gesture-based drawing in 2D, 3D, and AR environments
- **Gesture Recognition**: Hand gesture identification for common UI operations
- **AI-Powered Assistance**: OCR, math, diagram understanding, and architectural drawing
- **Collaboration**: Real-time multi-user editing and sharing
- **Export**: Multi-format export capabilities (SVG, PNG, PDF, LaTeX)

This document outlines the modular package structure for constructing this platform.

## Package Structure

The project is organized into **21 independent packages** covering different aspects of the system:

### Core Platform
- **packages/core**: Shared utilities and configuration
- **packages/models**: AI model registry and management
- **packages/inference**: Unified inference pipeline
- **packages/api**: REST API and WebSocket services
- **packages/storage**: Data storage and caching
- **packages/auth**: Authentication and authorization
- **packages/telemetry**: Monitoring and observability

### Feature Packages
- **packages/vision**: Camera capture and vision engine (P1)
- **packages/hand-tracking**: Hand landmark detection and tracking (P1)
- **packages/air-stroke**: Air stroke generation and smoothing (P1)
- **packages/drawing**: Drawing application and UI components (P1)
- **packages/gesture-ai**: Hand gesture recognition (P2)
- **packages/shape-ai**: Shape recognition and detection (P2)
- **packages/ocr**: OCR engine for text recognition (P2)
- **packages/math-ai**: Mathematical formula recognition (P2)
- **packages/diagram-ai**: Diagram understanding and recognition (P3)
- **packages/ai-assistant**: LLM-based AI assistant (P3)

### Collaboration Packages
- **packages/collaboration**: Real-time collaboration features (P3)
- **packages/export**: Export capabilities (P1)

### Domain-Specific Packages
- **packages/software-engineering**: Software engineering tools (P4)
- **packages/education**: Educational applications and tools (P4)
- **packages/healthcare**: Healthcare applications (P4)
- **packages/design**: Design tools and utilities (P4)

### Advanced Packages
- **packages/spatial**: AR/VR and spatial computing (P5)
- **packages/presentation**: Corporate presentation tools (P5)

### Enterprise Packages
- **packages/core/enterprise**: Enterprise-grade services

## Package Template

Each package should follow this standard structure:

```
packages/{package-name}/
├── README.md
├── package.json
├── tsconfig.json
├── index.ts
├── src/
│   ├── types/
│   ├── models/
│   ├── services/
│   ├── api/
│   └── utils/
├── tests/
├── docs/
├── examples/
└── benchmark/
```

## Installation

```bash
# Initialize monorepo
npm init -w

# Install all packages
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development
npm run dev
```

## Package Management

Each package is managed independently using npm workspaces:

```json
"packages": {
  "vision": {
    "dependencies": {
      "opencv-wasm": "^1.0.0",
      "@tensorflow-models/hands": "^0.1.0"
    }
  },
  "hand-tracking": {
    "dependencies": {
      "@mediapipe/hands": "^1.0.0",
      "@tensorflow-models/hand-tracking": "^0.1.0"
    }
  }
}
```

## Development Guidelines

### Repository Structure

```
AI Air Drawing System/
├── README.md
├── package.json
├── tsconfig.json
├── .dockerignore
├── .gitignore
├── .env.example
├── Makefile
└── packages/
    ├── core/
    ├── vision/
    ├── hand-tracking/
    ├── air-stroke/
    ├── gesture-ai/
    ├── drawing/
    ├── shape-ai/
    ├── ocr/
    ├── math-ai/
    ├── diagram-ai/
    ├── ai-assistant/
    ├── collaboration/
    ├── export/
    ├── software-engineering/
    ├── education/
    ├── healthcare/
    ├── design/
    ├── spatial/
    ├── presentation/
    └── enterprise/
```

### Package Independence

Each package should be:
- **Independent**: Can work standalone or integrated into other packages
- **Testable**: Comprehensive unit and integration tests
- **Documented**: README with usage examples
- **Benchmarkable**: Performance and accuracy benchmarks
- **Exportable**: Can be packaged separately

### Package Dependencies

```json
// Vision Engine Package
{
  "name": "@ai-air-drawing/vision",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "exports": {
    "types": "./types/index.d.ts",
    "default": "./dist/index.js"
  },
  "dependencies": {
    "opencv-wasm": "^1.0.0",
    "@tensorflow-models/camera-utils": "^1.0.0"
  }
}
```

## Package README Template

Create README files for each package (see examples in existing packages). Each README should contain:

1. **Package Description**: Brief description of what the package does
2. **Installation**: How to install and configure
3. **Usage**: Basic usage examples
4. **API Reference**: Key APIs and their parameters
5. **Models**: AI/ML models used (if applicable)
6. **Performance**: Benchmark results and performance metrics
7. **Testing**: Test suites and test results
8. **Contributing**: Contribution guidelines

## Monitoring and Observability

Each package should be monitored for:

- **Accuracy**: Model precision, recall, F1-score
- **Performance**: Latency, throughput, memory usage
- **Resource Usage**: CPU, GPU, memory consumption
- **Test Coverage**: Code coverage percentages
- **Dependencies**: Package dependencies and conflicts

## Build Scripts

Each package should have its own build scripts:

```json
"scripts": {
  "build": "tsc && vite build",
  "dev": "tsc --watch",
  "test": "jest",
  "lint": "eslint .",
  "format": "prettier --write .",
  "type-check": "tsc --noEmit",
  "benchmark": "node benchmark/index.js"
}
```

## Versioning Strategy

### Package Versioning
- **Semantic Versioning**: Use semantic versioning for each package
- **Independent Updates**: Each package can be versioned independently
- **Release Process**: Use conventional commits for package updates

### Release Commands

```bash
# Release a specific package
npm version --workspace=packages/vision patch

# Release all packages
lerna version --packages-changed

# Publish to npm
npm publish packages/vision
```

## Environment Configuration

Each package should have its own environment configuration:

```json
{
  "models": {
    "vision": {
      "modelPath": "./models/vision",
      "optimizationLevel": "high",
      "quantization": "int8"
    },
    "hands": {
      "modelPath": "./models/hands",
      "maxHands": 2,
      "minHandConfidence": 0.5
    }
  },
  "performance": {
    "maxMemory": "2GB",
    "maxCPU": "2.0",
    "threadPoolSize": 4
  },
  "logging": {
    "level": "info",
    "output": "console",
    "format": "json"
  }
}
```

## Package Lifecycle

### Development Phase
1. **Requirements**: Define package requirements and specifications
2. **Design**: Design API, database schema, and data flow
3. **Implementation**: Write code, tests, documentation
4. **Integration**: Integrate package into the larger system

### Testing Phase
1. **Unit Testing**: Test individual components
2. **Integration Testing**: Test component interactions
3. **Performance Testing**: Benchmark performance characteristics
4. **Regression Testing**: Ensure ongoing stability

### Deployment Phase
1. **Build**: Package application for distribution
2. **Publish**: Release to package registry
3. **Monitoring**: Monitor performance and usage
4. **Maintenance**: Monitor issues and implement fixes

## Contribution Guidelines

### Branch Strategy
- **Main Branch**: Main development branch
- **Feature Branches**: Feature development branches
- **Hotfix Branches**: Emergency fix branches

### Pull Request Process
1. Create a feature branch
2. Write descriptive commit messages
3. Add unit tests for new code
4. Run tests and linting
5. Create a pull request
6. Request code review
7. Merge when ready

### Code Quality Guidelines
- **TypeScript**: Use strict TypeScript configuration
- **Code Quality**: Enforce code quality standards
- **Documentation**: Write comprehensive documentation
- **Tests**: Write comprehensive test coverage
- **Performance**: Optimize for performance

## Package Usage Examples

### Importing Packages

```typescript
// Import from specific packages
import { VisionEngine } from '@ai-air-drawing/vision';
import { HandTracking } from '@ai-air-drawing/hand-tracking';
import { HandGestureRecognition } from '@ai-air-drawing/gesture-ai';
```

### Usage in Application

```typescript
class AirDrawingApp {
  private vision: VisionEngine;
  private handTracker: HandTracking;
  private gestureRecognizer: HandGestureRecognition;

  constructor() {
    this.vision = new VisionEngine({
      camera: 'webcam',
      resolution: { width: 1280, height: 720 }
    });
    this.handTracker = new HandTracking({
      modelPath: './models/hands',
      maxHands: 2
    });
    this.gestureRecognizer = new HandGestureRecognition({
      modelPath: './models/gesture',
      gestures: ['draw', 'clear', 'select', 'undo', 'redo']
    });
  }

  async startSession() {
    await this.vision.start();
    const stream = await this.vision.getStream();

    stream.on('frame', async (frame) => {
      const hands = await this.handTracker.detect(frame);
      if (hands.length > 0) {
        const gesture = await this.gestureRecognizer.recognize(hands[0]);
        this.handleGesture(gesture);
      }
    });
  }

  private handleGesture(gesture: string): void {
    switch (gesture) {
      case 'draw':
        this.drawingManager.startDrawing();
        break;
      case 'clear':
        this.drawingManager.clearCanvas();
        break;
      // Handle other gestures...
    }
  }
}
```

### Configuration

```typescript
// Configuration for Vision Engine
const visionConfig = {
  camera: {
    device: 'webcam',
    resolution: { width: 1280, height: 720 },
    frameRate: 60,
    constraints: { facingMode: 'user' }
  },
  preprocessors: {
    backgroundRemoval: true,
    stabilization: true,
    noiseReduction: true
  },
  performance: {
    maxFramesPerSecond: 120,
    maxMemoryUsage: '1GB',
    enableGPU: true
  },
  models: {
    cameraUtils: './models/camera-utils',
    objectDetection: './models/detector'
  }
};
```

## Next Steps

1. **Initialize Project**: Set up monorepo and package structure
2. **Create Core Packages**: Build fundamental packages (vision, hand-tracking, etc.)
3. **Develop Feature Packages**: Create advanced packages with AI capabilities
4. **Implement Integration**: Connect all packages into a cohesive system
5. **Deploy**: Deploy the system as a complete platform

## Future Directions

The modular architecture supports future expansions:

1. **New Packages**: New packages can be added to extend functionality
2. **Package Splitting**: Existing packages can be split into smaller, more focused packages
3. **Package Merging**: Related packages can be merged to reduce complexity
4. **Package Reusage**: Packages can be reused across different projects

This structured approach ensures long-term maintainability and scalability of the AI Air Drawing System.
