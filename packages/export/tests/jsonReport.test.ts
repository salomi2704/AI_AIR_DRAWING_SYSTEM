import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { JsonReportExporter } from '../src/jsonReport';
import { RecognitionReport } from '../src/types';

function sampleReport(): RecognitionReport {
  return {
    canvas: { width: 640, height: 480, strokes: 3, points: 120 },
    shapes: [
      {
        kind: 'rectangle',
        bbox: [100, 100, 200, 120],
        fitError: 0.02,
        params: { corners: [{ x: 100, y: 100 }], width: 200, height: 120 },
      },
      {
        kind: 'arrow',
        bbox: [300, 150, 200, 44],
        fitError: 0.11,
        params: { head: { x: 500, y: 172 } },
      },
    ],
    textRegions: [{ text: 'start', confidence: 90, box: [150, 130, 60, 25] }],
    diagram: {
      nodes: [{ id: 'n0', kind: 'rectangle', label: 'start' }],
      edges: [],
    },
    latex: ['E=mc^2'],
    summary: 'A flow diagram starting at a box labeled start.',
  };
}

describe('JsonReportExporter', () => {
  const exporter = new JsonReportExporter();

  it('serializes a report as pretty-printed JSON', () => {
    const data = exporter.serialize(sampleReport());
    const parsed = JSON.parse(data);
    expect(parsed.canvas.strokes).toBe(3);
    expect(parsed.diagram.nodes[0].label).toBe('start');
    expect(parsed.latex).toEqual(['E=mc^2']);
    expect(data.trimEnd().endsWith('}')).toBe(true);
  });

  it('includes shapes, fit params and text regions', () => {
    const parsed = JSON.parse(exporter.serialize(sampleReport())) as RecognitionReport;
    expect(parsed.shapes[0].kind).toBe('rectangle');
    expect(parsed.shapes[0].params.width).toBe(200);
    expect(parsed.shapes[0].fitError).toBeDefined();
    expect(parsed.textRegions[0].confidence).toBe(90);
  });

  it('writes a report file to disk and returns its path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-air-report-'));
    const file = path.join(dir, 'report.json');
    const written = exporter.write(sampleReport(), file);
    expect(written).toBe(file);
    expect(fs.existsSync(file)).toBe(true);
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(onDisk.summary).toContain('flow diagram');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('creates missing parent directories when writing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-air-report-'));
    const file = path.join(dir, 'nested', 'deep', 'report.json');
    const written = exporter.write(sampleReport(), file);
    expect(fs.existsSync(written)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
