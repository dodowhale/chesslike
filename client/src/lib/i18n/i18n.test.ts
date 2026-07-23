import { describe, test, expect } from 'bun:test';
import { ko } from './ko';
import { en } from './en';

function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getAllKeys(obj[k], keyPath));
    } else {
      keys.push(`${keyPath}:${typeof obj[k]}`);
    }
  }
  return keys.sort();
}

describe('i18n dictionaries', () => {
  test('ko and en dictionaries should have matching key structures and value types', () => {
    const koKeys = getAllKeys(ko);
    const enKeys = getAllKeys(en);

    expect(koKeys).toEqual(enKeys);
  });
});
