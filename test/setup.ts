import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

process.env.TMDB_READ_TOKEN = 'test-token';
delete process.env.TMDB_API_BASE_URL;

afterEach(() => {
  cleanup();
});

vi.mock('next/image', async () => {
  const { createElement } = await import('react');
  return {
    default: (props: { src: string; alt: string; width?: number; height?: number; className?: string }) =>
      createElement('img', {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        className: props.className,
      }),
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode } & Record<string, unknown>) =>
      createElement('a', { href, ...rest }, children),
  };
});
