type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassArray = ClassValue[];
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassDictionary
  | ClassArray;

const pushClassName = (classes: string[], value: ClassValue): void => {
  if (!value) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    classes.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => pushClassName(classes, entry));
    return;
  }

  Object.entries(value).forEach(([className, enabled]) => {
    if (enabled) {
      classes.push(className);
    }
  });
};

type AtomicDimension =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'width'
  | 'height'
  | 'gap-x'
  | 'gap-y'
  | 'radius-top-left'
  | 'radius-top-right'
  | 'radius-bottom-right'
  | 'radius-bottom-left'
  | 'color'
  | 'size'
  | 'align'
  | 'display'
  | 'position'
  | 'font'
  | 'justify'
  | 'items'
  | 'content'
  | 'self'
  | 'place-items'
  | 'place-content'
  | 'place-self'
  | 'direction'
  | 'wrap'
  | 'overflow-x'
  | 'overflow-y'
  | 'opacity'
  | 'shadow'
  | 'cursor'
  | 'grid-cols'
  | 'grid-rows'
  | 'ring-width'
  | 'ring-color';

interface MergeRule {
  dimensions: AtomicDimension[];
  family: string;
}

interface MergeEntry {
  dimensions?: AtomicDimension[];
  family?: string;
  prefix: string;
  removed: boolean;
  token: string;
}

const TEXT_SIZE_TOKENS = new Set([
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
]);

const TEXT_ALIGNMENT_TOKENS = new Set([
  'left',
  'center',
  'right',
  'justify',
  'start',
  'end',
]);

const BG_NON_COLOR_TOKENS = new Set([
  'auto',
  'bottom',
  'center',
  'clip-border',
  'clip-content',
  'clip-padding',
  'clip-text',
  'contain',
  'content',
  'cover',
  'fixed',
  'left',
  'left-bottom',
  'left-top',
  'local',
  'no-repeat',
  'none',
  'origin-border',
  'origin-content',
  'origin-padding',
  'repeat',
  'repeat-round',
  'repeat-space',
  'repeat-x',
  'repeat-y',
  'right',
  'right-bottom',
  'right-top',
  'scroll',
  'top',
]);

const DISPLAY_TOKENS = new Set([
  'block',
  'contents',
  'flex',
  'grid',
  'hidden',
  'inline',
  'inline-block',
  'inline-flex',
  'inline-grid',
  'table',
  'table-caption',
  'table-cell',
  'table-column',
  'table-column-group',
  'table-footer-group',
  'table-header-group',
  'table-row',
  'table-row-group',
]);

const POSITION_TOKENS = new Set([
  'absolute',
  'fixed',
  'relative',
  'static',
  'sticky',
]);

const SIDE_DIMENSIONS: Record<string, AtomicDimension[]> = {
  b: ['bottom'],
  l: ['left'],
  r: ['right'],
  t: ['top'],
  x: ['left', 'right'],
  y: ['top', 'bottom'],
};

const CORNER_DIMENSIONS: Record<string, AtomicDimension[]> = {
  b: ['radius-bottom-left', 'radius-bottom-right'],
  bl: ['radius-bottom-left'],
  br: ['radius-bottom-right'],
  l: ['radius-top-left', 'radius-bottom-left'],
  r: ['radius-top-right', 'radius-bottom-right'],
  t: ['radius-top-left', 'radius-top-right'],
  tl: ['radius-top-left'],
  tr: ['radius-top-right'],
};

const ALL_PADDING_DIMENSIONS: AtomicDimension[] = ['top', 'right', 'bottom', 'left'];
const ALL_SIZE_DIMENSIONS: AtomicDimension[] = ['width', 'height'];
const ALL_GAP_DIMENSIONS: AtomicDimension[] = ['gap-x', 'gap-y'];
const ALL_RADIUS_DIMENSIONS: AtomicDimension[] = ['radius-top-left', 'radius-top-right', 'radius-bottom-right', 'radius-bottom-left'];
const ALL_SIDE_DIMENSIONS: AtomicDimension[] = ['top', 'right', 'bottom', 'left'];

const getSpacingRule = (base: string, family: 'padding' | 'margin'): MergeRule | null => {
  const match = base.match(/^-?[pm]([trblxy])?-(.+)$/);
  if (!match) {
    return null;
  }

  const side = match[1];

  return {
    family,
    dimensions: side ? SIDE_DIMENSIONS[side] : ALL_PADDING_DIMENSIONS,
  };
};

const getSizeRule = (base: string): MergeRule | null => {
  if (base.startsWith('size-')) {
    return { family: 'size', dimensions: ALL_SIZE_DIMENSIONS };
  }
  if (base.startsWith('w-')) {
    return { family: 'size', dimensions: ['width'] };
  }
  if (base.startsWith('h-')) {
    return { family: 'size', dimensions: ['height'] };
  }
  if (base.startsWith('min-w-')) {
    return { family: 'min-size', dimensions: ['width'] };
  }
  if (base.startsWith('min-h-')) {
    return { family: 'min-size', dimensions: ['height'] };
  }
  if (base.startsWith('max-w-')) {
    return { family: 'max-size', dimensions: ['width'] };
  }
  if (base.startsWith('max-h-')) {
    return { family: 'max-size', dimensions: ['height'] };
  }

  return null;
};

const getRoundedRule = (base: string): MergeRule | null => {
  if (!base.startsWith('rounded')) {
    return null;
  }

  if (!base.includes('-')) {
    return { family: 'rounded', dimensions: ALL_RADIUS_DIMENSIONS };
  }

  const tokens = base.split('-');
  const corner = tokens[1];

  if (!corner || !CORNER_DIMENSIONS[corner]) {
    return { family: 'rounded', dimensions: ALL_RADIUS_DIMENSIONS };
  }

  return {
    family: 'rounded',
    dimensions: CORNER_DIMENSIONS[corner],
  };
};

const getGapRule = (base: string): MergeRule | null => {
  if (base.startsWith('gap-x-')) {
    return { family: 'gap', dimensions: ['gap-x'] };
  }
  if (base.startsWith('gap-y-')) {
    return { family: 'gap', dimensions: ['gap-y'] };
  }
  if (base.startsWith('gap-')) {
    return { family: 'gap', dimensions: ALL_GAP_DIMENSIONS };
  }

  return null;
};

const getBorderWidthRule = (base: string): MergeRule | null => {
  const match = base.match(/^border(?:-([trblxy]))?(?:-(0|2|4|8|\[[^\]]+\]))?$/);
  if (!match) {
    return null;
  }

  const side = match[1];

  return {
    family: 'border-width',
    dimensions: side ? SIDE_DIMENSIONS[side] : ALL_SIDE_DIMENSIONS,
  };
};

const getBorderColorRule = (base: string): MergeRule | null => {
  const match = base.match(/^border(?:-([trblxy]))?-(.+)$/);
  if (!match || getBorderWidthRule(base)) {
    return null;
  }

  const side = match[1];

  return {
    family: 'border-color',
    dimensions: side ? SIDE_DIMENSIONS[side] : ALL_SIDE_DIMENSIONS,
  };
};

const getTextRule = (base: string): MergeRule | null => {
  if (!base.startsWith('text-')) {
    return null;
  }

  const value = base.slice('text-'.length);

  if (TEXT_SIZE_TOKENS.has(value) || value.startsWith('[')) {
    return { family: 'text-size', dimensions: ['size'] };
  }
  if (TEXT_ALIGNMENT_TOKENS.has(value)) {
    return { family: 'text-align', dimensions: ['align'] };
  }

  return { family: 'text-color', dimensions: ['color'] };
};

const getBackgroundRule = (base: string): MergeRule | null => {
  if (!base.startsWith('bg-')) {
    return null;
  }

  const value = base.slice('bg-'.length);
  if (BG_NON_COLOR_TOKENS.has(value)) {
    return null;
  }

  return { family: 'background', dimensions: ['color'] };
};

const getRingRule = (base: string): MergeRule | null => {
  if (base === 'ring' || /^ring-(0|1|2|4|8|\[[^\]]+\])$/.test(base)) {
    return { family: 'ring-width', dimensions: ['ring-width'] };
  }
  if (base.startsWith('ring-')) {
    return { family: 'ring-color', dimensions: ['ring-color'] };
  }

  return null;
};

const getSingleDimensionRule = (
  base: string,
  family: string,
  prefixes: string[],
  dimension: AtomicDimension,
): MergeRule | null => {
  if (prefixes.some((prefix) => base === prefix || base.startsWith(`${prefix}-`))) {
    return { family, dimensions: [dimension] };
  }

  return null;
};

const getVariantRule = (base: string): MergeRule | null => {
  return (
    getSingleDimensionRule(base, 'font', ['font'], 'font')
    ?? getSingleDimensionRule(base, 'justify', ['justify'], 'justify')
    ?? getSingleDimensionRule(base, 'items', ['items'], 'items')
    ?? getSingleDimensionRule(base, 'content', ['content'], 'content')
    ?? getSingleDimensionRule(base, 'self', ['self'], 'self')
    ?? getSingleDimensionRule(base, 'place-items', ['place-items'], 'place-items')
    ?? getSingleDimensionRule(base, 'place-content', ['place-content'], 'place-content')
    ?? getSingleDimensionRule(base, 'place-self', ['place-self'], 'place-self')
    ?? getSingleDimensionRule(base, 'opacity', ['opacity'], 'opacity')
    ?? getSingleDimensionRule(base, 'shadow', ['shadow'], 'shadow')
    ?? getSingleDimensionRule(base, 'cursor', ['cursor'], 'cursor')
    ?? getSingleDimensionRule(base, 'grid-cols', ['grid-cols'], 'grid-cols')
    ?? getSingleDimensionRule(base, 'grid-rows', ['grid-rows'], 'grid-rows')
  );
};

const getFamilyRule = (base: string): MergeRule | null => {
  const paddingRule = getSpacingRule(base, 'padding');
  if (paddingRule) {
    return paddingRule;
  }

  const marginRule = getSpacingRule(base, 'margin');
  if (marginRule) {
    return marginRule;
  }

  return (
    getSizeRule(base)
    ?? getRoundedRule(base)
    ?? getGapRule(base)
    ?? getBorderWidthRule(base)
    ?? getBorderColorRule(base)
    ?? getTextRule(base)
    ?? getBackgroundRule(base)
    ?? getRingRule(base)
    ?? (DISPLAY_TOKENS.has(base) ? { family: 'display', dimensions: ['display'] } : null)
    ?? (POSITION_TOKENS.has(base) ? { family: 'position', dimensions: ['position'] } : null)
    ?? (/^flex-(row|col|row-reverse|col-reverse)$/.test(base) ? { family: 'flex-direction', dimensions: ['direction'] } : null)
    ?? (/^flex-(wrap|nowrap|wrap-reverse)$/.test(base) ? { family: 'flex-wrap', dimensions: ['wrap'] } : null)
    ?? (/^overflow(?:-(x|y))?-/.test(base)
      ? {
          family: 'overflow',
          dimensions: base.startsWith('overflow-x-')
            ? ['overflow-x']
            : base.startsWith('overflow-y-')
              ? ['overflow-y']
              : ['overflow-x', 'overflow-y'],
        }
      : null)
    ?? getVariantRule(base)
  );
};

const splitVariants = (token: string) => {
  const segments: string[] = [];
  let bracketDepth = 0;
  let current = '';

  for (const character of token) {
    if (character === '[') {
      bracketDepth += 1;
    } else if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (character === ':' && bracketDepth === 0) {
      segments.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  segments.push(current);

  const base = segments.pop() ?? token;
  const prefix = segments.join(':');

  return { base, prefix };
};

const isSubset = (left: AtomicDimension[], right: AtomicDimension[]) => {
  return left.every((value) => right.includes(value));
};

const mergeTailwindClasses = (input: string) => {
  const entries: MergeEntry[] = [];
  const tokens = input.trim().split(/\s+/).filter(Boolean);

  tokens.forEach((token) => {
    const { base, prefix } = splitVariants(token);
    const rule = getFamilyRule(base);

    if (!rule) {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index];
        if (!entry.removed && entry.token === token) {
          entry.removed = true;
          break;
        }
      }

      entries.push({ prefix, removed: false, token });
      return;
    }

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (
        entry.removed
        || entry.prefix !== prefix
        || entry.family !== rule.family
        || !entry.dimensions
      ) {
        continue;
      }

      if (isSubset(entry.dimensions, rule.dimensions)) {
        entry.removed = true;
      }
    }

    entries.push({
      dimensions: rule.dimensions,
      family: rule.family,
      prefix,
      removed: false,
      token,
    });
  });

  return entries
    .filter((entry) => !entry.removed)
    .map((entry) => entry.token)
    .join(' ');
};

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];

  inputs.forEach((input) => pushClassName(classes, input));

  return mergeTailwindClasses(classes.join(' '));
}
