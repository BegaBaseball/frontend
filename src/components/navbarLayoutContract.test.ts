import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const readComponentSource = async (componentFile: string) => {
  const sourceUrl = new URL(componentFile, import.meta.url);
  return readFile(sourceUrl, 'utf8');
};

const readNumericConstant = (source: string, constantName: string): number => {
  const match = source.match(new RegExp(`const ${constantName} = (\\d+);`));
  assert.ok(match, `${constantName} constant exists`);
  return Number(match[1]);
};

describe('navbar desktop layout contract', () => {
  it('reserves the logged-in compact capsule width in both desktop navbar shells', async () => {
    const [publicNavbarSource, authenticatedNavbarSource] = await Promise.all([
      readComponentSource('./PublicNavbar.tsx'),
      readComponentSource('./Navbar.tsx'),
    ]);

    assert.equal(
      readNumericConstant(publicNavbarSource, 'DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH'),
      1040,
      'PublicNavbar compact authenticated width',
    );
    assert.equal(
      readNumericConstant(authenticatedNavbarSource, 'DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH'),
      1040,
      'Navbar compact authenticated width',
    );
  });
});
