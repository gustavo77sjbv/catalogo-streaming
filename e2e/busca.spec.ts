import { expect, test } from '@playwright/test';

test('buscar um título mostra onde assistir', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('searchbox', { name: 'Buscar filme ou série' }).fill('teste');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/\/busca\?q=teste/);
  const card = page.getByRole('article', { name: 'Série Teste' });
  await expect(card.getByText('Netflix')).toBeVisible();
});

test('título fora dos streamings aparece com aviso', async ({ page }) => {
  await page.goto('/busca?q=sem%20streaming');
  const card = page.getByRole('article', { name: 'Filme Sem Streaming' });
  await expect(card.getByText('Não disponível em streaming no Brasil')).toBeVisible();
});
