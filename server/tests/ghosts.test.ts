import { describe, it, expect } from 'vitest';
import { distortQuestion } from '../src/domain/ghosts';

describe('ghosts', () => {
  it('keeps ghost questions readable with their Spanish punctuation and accents', () => {
    expect(distortQuestion('¿Hay alguien ahí?')).toBe('¿Hay alguien ahí?…');
    expect(distortQuestion('¿Qué pasó?')).toBe('¿Qué pasó?…');
    expect(distortQuestion('')).toBe('¿Hay alguien ahí?…');
  });

  it('does not append a second ellipsis', () => {
    expect(distortQuestion('¿Quién está ahí?…')).toBe('¿Quién está ahí?…');
  });
});