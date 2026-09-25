// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTitle } from '../../test/fixtures';
import { TitleGrid } from './TitleGrid';

describe('TitleGrid', () => {
  it('renderiza um item por título, sem colidir filme e série com o mesmo id', () => {
    render(
      <TitleGrid
        titles={[makeTitle({ id: 1, tipo: 'filme', titulo: 'A' }), makeTitle({ id: 1, tipo: 'serie', titulo: 'B' })]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument();
  });
});
