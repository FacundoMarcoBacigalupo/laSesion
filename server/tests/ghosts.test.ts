import { describe, it, expect } from 'vitest';
import { distortQuestion } from '../src/domain/ghosts';

describe('ghosts', () => {
  it('distorts', () => {
    expect(distortQuestion('hola mundo')).toContain('…');
    expect(distortQuestion('')).toBe('¿Hay alguien ahí?');
  });
});