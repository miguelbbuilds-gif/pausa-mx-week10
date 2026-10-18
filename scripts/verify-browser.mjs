import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.PAUSA_URL ?? 'http://127.0.0.1:5174';
const evidence = path.resolve('evidence');

const errors = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(evidence, name), fullPage: true });
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (error) => errors.push(error.message));

try {
  await mkdir(evidence, { recursive: true });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: 'Tu dinero. Tu decisión.' }).waitFor();
  await shot(page, 'landing-desktop.png');

  await page.goto(`${base}/perfil`);
  await page.reload();
  await page.getByRole('textbox', { name: 'Ingreso neto mensual *' }).fill('-5');
  await page.getByRole('button', { name: 'Guardar perfil en este navegador' }).click();
  await page.getByRole('alert').first().waitFor();
  assert(
    (await page.getByRole('alert').first().innerText()).includes('números'),
    'Negative income should be rejected',
  );

  await page.goto(`${base}/evaluar`);
  await page.getByRole('radio', { name: /En pagos/ }).click();
  await page.getByLabel('Precio de contado').fill('3000');
  await page.getByLabel('Número de pagos').fill('0');
  await page.getByRole('button', { name: 'Calcular mensualidad' }).click();
  assert(
    (await page.getByRole('status').innerText()).includes('No se puede dividir'),
    'Zero installments should not divide',
  );

  await page.goto(`${base}/demo`);
  await page.getByRole('button', { name: 'Cargar este ejemplo' }).first().click();
  const confirm = page.getByRole('button', { name: 'Continuar' });
  if (await confirm.count()) await confirm.click();
  await page.getByText('EJEMPLO / DATOS FICTICIOS').first().waitFor();
  await page.waitForFunction(() => localStorage.getItem('pausa-mx-state-v1')?.includes('Chamarra'));
  await shot(page, 'demo-desktop.png');

  await page.goto(`${base}/evaluar?paso=sugerencia`);
  await page.reload();
  const outcome = page.getByTestId('outcome');
  await outcome.waitFor();
  const outcomeText = await outcome.innerText();
  assert(outcomeText.includes('NO COMPRES POR AHORA'), `Expected NO COMPRES, got: ${outcomeText}`);
  assert(outcomeText.includes('no hay un puntaje oculto'), 'Shadow clause missing');
  const body = await page.locator('body').innerText();
  assert(body.includes('$0.00'), 'Expected a zero monthly surplus');
  assert(body.includes('-$1,000.00') || body.includes('−$1,000.00'), 'Expected the separate cash shortfall of 1000');
  await shot(page, 'recommendation-desktop.png');

  await page.getByRole('radio', { name: /podría comprar/ }).check();
  await page.getByRole('checkbox', { name: /Conservar este registro/ }).check();
  await page.getByRole('button', { name: 'Guardar mi decisión' }).click();
  await page.getByRole('heading', { name: 'Chamarra' }).waitFor();
  const decisionText = await page.locator('body').innerText();
  assert(decisionText.includes('PODRÍAS COMPRAR'), 'Override label missing');
  assert(decisionText.includes('NO COMPRES POR AHORA'), 'Original suggestion missing after override');
  await page.reload();
  await page.getByRole('heading', { name: 'Chamarra' }).waitFor();
  await shot(page, 'decisions-desktop.png');

  await page.goto(`${base}/pagos`);
  await page.reload();
  await page.getByRole('heading', { name: 'Audífonos a meses (ejemplo)' }).waitFor();
  const payments = await page.locator('body').innerText();
  assert(payments.includes('no se suman otra vez') || payments.includes('Añadido por la regla: $0.00'), 'Inclusion rule not visible');
  await page.getByRole('table').waitFor();
  await shot(page, 'payments-desktop.png');

  await page.goto(`${base}/privacidad`);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  assert(download.suggestedFilename() === 'pausa-mx-datos.json', 'Export filename mismatch');

  await page.evaluate(() => localStorage.setItem('pausa-mx-state-v1', '{'));
  await page.reload();
  await page.getByText('No se pudo leer lo guardado').waitFor();

  await page.getByRole('button', { name: 'Borrar todos los datos de este navegador' }).click();
  await page.getByRole('button', { name: 'Sí, borrar todos los datos' }).click();
  await page.getByText('Se borraron los datos').waitFor();

  await page.goto(`${base}/demo`);
  await page.getByRole('button', { name: 'Cargar este ejemplo' }).nth(1).click();
  if (await page.getByRole('button', { name: 'Continuar' }).count()) {
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await page.waitForFunction(() => localStorage.getItem('pausa-mx-state-v1')?.includes('Cinturón'));
  await page.goto(`${base}/evaluar?paso=sugerencia`);
  await page.getByTestId('outcome').waitFor();
  const affordable = await page.getByTestId('outcome').innerText();
  assert(affordable.includes('PODRÍAS COMPRAR'), `Expected affordable case, got: ${affordable}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('heading', { name: 'Tu dinero. Tu decisión.' }).waitFor();
  await shot(page, 'landing-mobile.png');
  await page.goto(`${base}/evaluar?paso=sugerencia`);
  await shot(page, 'recommendation-mobile.png');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/ruta-que-no-existe`);
  await page.getByRole('heading', { name: 'Esta página no existe' }).waitFor();

  const empty = await page.evaluate(() => {
    localStorage.clear();
    return true;
  });
  assert(empty, 'cleanup failed');

  if (errors.length > 0) throw new Error(`Page errors:\n${errors.join('\n')}`);
  console.log('Browser verification passed');
} finally {
  await browser.close();
}
