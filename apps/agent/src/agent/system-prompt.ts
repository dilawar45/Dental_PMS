import fs from 'node:fs';
import path from 'node:path';

let cachedPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  const candidates = [
    path.resolve(process.cwd(), 'prompts/system.md'),
    path.resolve(process.cwd(), 'apps/agent/prompts/system.md'),
    path.resolve(__dirname, '../../prompts/system.md'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedPrompt = fs.readFileSync(candidate, 'utf-8');
      return cachedPrompt;
    }
  }

  throw new Error('System prompt not found at prompts/system.md');
}
