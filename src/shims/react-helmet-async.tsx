import { Children, isValidElement, type PropsWithChildren, useEffect } from 'react';
import type { ReactNode } from 'react';

type HelmetProps = PropsWithChildren<{
  prioritizeSeoTags?: boolean;
}>;

const MANAGED_ATTR = 'data-bega-helmet';

const cleanupManagedHeadTags = () => {
  const existing = document.head.querySelectorAll(`[${MANAGED_ATTR}="true"]`);
  existing.forEach((node) => node.parentNode?.removeChild(node));
};

const getElementText = (value: ReactNode): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(getElementText).join('');
  }
  return '';
};

const toManagedElement = (tagName: string, props: Record<string, unknown>): HTMLElement => {
  const element = document.createElement(tagName);
  element.setAttribute(MANAGED_ATTR, 'true');

  Object.entries(props).forEach(([key, value]) => {
    if (value == null || key === 'children' || key === 'dangerouslySetInnerHTML') {
      return;
    }

    if (key === 'className') {
      element.setAttribute('class', String(value));
      return;
    }

    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(key, '');
      }
      return;
    }

    element.setAttribute(key, String(value));
  });

  const htmlPayload = props.dangerouslySetInnerHTML as { __html?: string } | undefined;
  if (htmlPayload?.__html) {
    element.innerHTML = htmlPayload.__html;
  } else if (props.children) {
    element.textContent = getElementText(props.children as ReactNode);
  }

  return element;
};

export function HelmetProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function Helmet({ children }: HelmetProps) {
  useEffect(() => {
    cleanupManagedHeadTags();

    const nodes = Children.toArray(children);
    for (const node of nodes) {
      if (!isValidElement(node) || typeof node.type !== 'string') {
        continue;
      }

      const tag = node.type.toLowerCase();
      const props = node.props as Record<string, unknown>;

      if (tag === 'html') {
        if (typeof props.lang === 'string') {
          document.documentElement.lang = props.lang;
        }
        continue;
      }

      if (tag === 'title') {
        document.title = getElementText(props.children as ReactNode);
        continue;
      }

      if (tag === 'meta' || tag === 'link' || tag === 'script') {
        const element = toManagedElement(tag, props);
        document.head.appendChild(element);
      }
    }

    return cleanupManagedHeadTags;
  }, [children]);

  return null;
}
