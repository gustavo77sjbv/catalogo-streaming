import { expect, test } from '@playwright/test';

test('a raiz abre o catálogo de filmes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/filmes$/);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toBeVisible();
});

test('filtrar por gênero atualiza a URL e a grade', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('group', { name: 'Gêneros' }).getByRole('button', { name: 'Comédia' }).click();
  await expect(page).toHaveURL(/genero=35/);
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toBeVisible();
});

test('filtrar por streaming mostra só o que está nele', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('group', { name: 'Streamings' }).getByRole('button', { name: 'Prime Video' }).click();
  await expect(page).toHaveURL(/streaming=119/);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toBeVisible();
});

test('a aba Séries mostra o catálogo de séries', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('link', { name: 'Séries' }).click();
  await expect(page).toHaveURL(/\/series$/);
  await expect(page.getByRole('heading', { name: 'Série Teste' })).toBeVisible();
});
