import assert from 'node:assert/strict';
import test from 'node:test';

import { cn } from './utils';

test('keeps partial spacing overrides that still rely on the base class', () => {
  assert.equal(cn('p-3', 'px-4'), 'p-3 px-4');
  assert.equal(cn('gap-4', 'gap-x-2'), 'gap-4 gap-x-2');
  assert.equal(cn('size-9', 'w-8'), 'size-9 w-8');
  assert.equal(cn('rounded-l-md', 'rounded-tl-none'), 'rounded-l-md rounded-tl-none');
});

test('replaces full conflicts with the latest class in the same variant scope', () => {
  assert.equal(cn('rounded-md', 'rounded-full'), 'rounded-full');
  assert.equal(cn('text-sm', 'text-lg'), 'text-lg');
  assert.equal(cn('bg-primary/90', 'bg-transparent'), 'bg-transparent');
  assert.equal(cn('dark:hover:bg-input/50', 'dark:hover:bg-gray-700'), 'dark:hover:bg-gray-700');
});

test('preserves distinct text size and color utilities', () => {
  assert.equal(
    cn('text-sm font-medium', 'text-gray-500 dark:text-white py-2'),
    'text-sm font-medium text-gray-500 dark:text-white py-2',
  );
});

test('matches the project button override patterns', () => {
  assert.equal(
    cn(
      'inline-flex items-center justify-center gap-2 rounded-md text-sm',
      'pl-0 text-sm hover:bg-transparent sm:text-base',
    ),
    'inline-flex items-center justify-center gap-2 rounded-md pl-0 text-sm hover:bg-transparent sm:text-base',
  );

  assert.equal(
    cn(
      'bg-primary text-primary-foreground hover:bg-primary/90',
      'border-primary text-primary hover:bg-primary/10 sm:w-auto',
    ),
    'bg-primary border-primary text-primary hover:bg-primary/10 sm:w-auto',
  );

  assert.equal(
    cn('h-9 px-4 py-2 has-[>svg]:px-3', 'h-9 px-3'),
    'py-2 has-[>svg]:px-3 h-9 px-3',
  );
});

test('supports card and ring overrides used by shared primitives', () => {
  assert.equal(cn('px-6 [&:last-child]:pb-6', 'px-2 pb-0'), '[&:last-child]:pb-6 px-2 pb-0');
  assert.equal(cn('focus-visible:ring-ring/50 focus-visible:ring-[3px]', 'focus-visible:ring-0'), 'focus-visible:ring-ring/50 focus-visible:ring-0');
  assert.equal(cn('border border-input', 'border-primary'), 'border border-primary');
});

test('flattens nested inputs and conditional dictionaries', () => {
  assert.equal(
    cn('flex', ['items-center', null, ['gap-2']], { 'text-sm': true, hidden: false }),
    'flex items-center gap-2 text-sm',
  );
});
