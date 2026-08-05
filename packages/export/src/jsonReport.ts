import { RecognitionReport } from './types';
import { createLogger } from '@ai-air-drawing/core';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger({ context: 'JsonReportExporter' });

export class JsonReportExporter {
  serialize(report: RecognitionReport): string {
    return JSON.stringify(report, null, 2) + '\n';
  }

  write(report: RecognitionReport, filePath: string): string {
    const resolved = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, this.serialize(report), 'utf8');
    logger.debug(`Wrote recognition report to ${resolved}`);
    return resolved;
  }
}

export const jsonReportExporter = new JsonReportExporter();
