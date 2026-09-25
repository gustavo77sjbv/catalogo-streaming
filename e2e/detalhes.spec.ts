import { expect, test } from '@playwright/test';

test('clicar num card abre os detalhes e "Voltar" retorna ao catálogo', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('link', { name: 'Ver detalhes de Comédia Teste' }).click();

  await expect(page).toHaveURL(/\/filmes\/1$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Comédia Teste' })).toBeVisible();
  await expect(page.getByText('Sinopse de Comédia Teste.')).toBeVisible();
  await expect(page.getByLabel('Classificação indicativa: 12 anos')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Onde assistir' }).getByText('Netflix')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Elenco' }).getByText('Atriz Teste')).toBeVisible();

  await page.getByRole('link', { name: '← Voltar' }).click();
  await expect(page).toHaveURL(/\/filmes$/);
});

test('séries abrem em /series/[id]', async ({ page }) => {
  await page.goto('/series/10');
  await expect(page.getByRole('heading', { level: 1, name: 'Série Teste' })).toBeVisible();
  await expect(page.getByText('2020 · 2 temporadas · 16 episódios')).toBeVisible();
});

test('ID inexistente ou inválido mostra "Título não encontrado"', async ({ page }) => {
  await page.goto('/filmes/999');
  await expect(page.getByRole('heading', { name: 'Título não encontrado' })).toBeVisible();
  await page.goto('/filmes/abc');
  await expect(page.getByRole('heading', { name: 'Título não encontrado' })).toBeVisible();
});
