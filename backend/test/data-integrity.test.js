import test from 'node:test';
import assert from 'node:assert/strict';
import { protectFinancialNames, restoreFinancialNames, preservesFinancialNames, preservesFinancialNumbers, isLikelyLanguage, localizedHorizon } from '../src/services/financialLanguageService.js';
import { parseFedSchedule, parseBlsSchedule, releaseInstant, normalizeFeed } from '../src/services/economicCalendarService.js';
import { verifiedEvidence, validateItem } from '../src/services/fundamentalsAnalysisService.js';
import { numericEventValue, localCalendarEvent, classifyEconomicEvent } from '../../frontend/src/utils/calendar.js';
import { assetLabel } from '../../frontend/src/utils/assetLabel.js';
import { localizeMacroTitle } from '../../frontend/src/utils/macroTitles.js';

test('brands and ticker identities survive translation, including repeated and mixed case names', () => {
  const input = protectFinancialNames('Apple and Amazon beat Nvidia; Apple AAPL rises 5%');
  assert.equal(restoreFinancialNames(input.text.replace('and', 'y').replace('beat', 'superan').replace('rises', 'sube'), input.identities), 'Apple y Amazon superan Nvidia; Apple AAPL sube 5%');
  assert.equal(restoreFinancialNames(input.text.replace(input.identities[0].token, 'Manzanas'), input.identities), null);
  assert.equal(preservesFinancialNames('Apple and Amazon', 'Manzanas y Amazonia'), false);
  assert.equal(preservesFinancialNumbers('Apple gains 5.2%', 'Apple sube 52%'), false);
});

test('clearly foreign analysis is rejected and horizon labels use the selected language', () => {
  assert.equal(isLikelyLanguage('The company may increase its supply while the stock remains under pressure.', 'es'), false);
  assert.equal(isLikelyLanguage('La empresa puede aumentar sus ventas mientras el mercado sigue bajo presión.', 'es'), true);
  assert.equal(isLikelyLanguage('A empresa pode aumentar as suas vendas enquanto o mercado permanece sob pressão.', 'pt'), true);
  assert.equal(localizedHorizon('near', 'es'), 'Corto plazo');
});

test('source quotes must be verbatim and must not be newsletter boilerplate', () => {
  const source = 'Apple reported stronger sales in China during the latest quarter.';
  assert.equal(verifiedEvidence(source, source), source);
  assert.equal(verifiedEvidence('Apple reported weaker sales in China during the latest quarter.', source), '');
  assert.equal(verifiedEvidence('Your day-ahead look for Oct. 23, 2026', 'Your day-ahead look for Oct. 23, 2026'), '');
});

test('analysis with an unsupported quote, altered brand or wrong language cannot become contextual', () => {
  const article = { title: 'Apple gains 5%', analysisDepth: 'rss', analysisText: 'Apple reported stronger sales in China during the latest quarter.' };
  const item = { index: 0, language: 'es', localizedTitle: 'Apple sube 5%', summary: 'La empresa informa de una mejora de sus ventas.', mechanism: 'Las ventas pueden cambiar las expectativas del mercado.', watch: 'Revisar las ventas y los resultados de la empresa.', limitations: 'El texto no detalla las cifras de ventas.', horizon: 'near', factors: { severity: 20, assetLink: 60, surprise: 20, persistence: 20, evidence: 40 }, direction: 10, confidence: 95, evidenceQuote: article.analysisText };
  assert.equal(validateItem(item, 0, article, 'es')?.confidence, 60);
  assert.equal(validateItem({ ...item, localizedTitle: 'Manzanas sube 5%' }, 0, article, 'es'), null);
  assert.equal(validateItem({ ...item, evidenceQuote: 'This quote was never in the publisher text.' }, 0, article, 'es'), null);
  assert.equal(validateItem({ ...item, summary: 'The company may increase its supply while the stock remains under pressure.' }, 0, article, 'es'), null);
  assert.equal(validateItem(item, 0, { ...article, analysisDepth: 'title' }, 'es'), null);
});

test('release times correctly include Eastern daylight saving changes', () => {
  assert.equal(releaseInstant('2026-10-29', '08:30'), '2026-10-29T12:30:00.000Z');
  assert.equal(releaseInstant('2026-11-10', '08:30'), '2026-11-10T13:30:00.000Z');
});

test('official schedule parsing uses the selected year and decision day without invented hours', () => {
  const html = '<h4>2026 FOMC Meetings</h4><div class="fomc-meeting__month"><strong>October</strong></div><div class="fomc-meeting__date">27-28</div><h4>2025 FOMC Meetings</h4><div class="fomc-meeting__month">November</div><div class="fomc-meeting__date">4</div>';
  const events = parseFedSchedule(html, 2026);
  assert.deepEqual(events.map(event => event.date), ['2026-10-28']);
  assert.equal(events[0].time, null);
  assert.equal(events[0].forecast, null);
});

test('BLS CPI date and reference month come from the official row', () => {
  const html = '<tr><td class="date-cell"><p>Tuesday, November 10, 2026</p></td><td class="time-cell">08:30 AM</td><td class="desc-cell"><strong>Consumer Price Index</strong> for October 2026</td></tr>';
  const [event] = parseBlsSchedule(html, 2026);
  assert.equal(event.date, '2026-11-10');
  assert.equal(event.period, '2026-10');
  assert.equal(event.scheduledAt, '2026-11-10T13:30:00.000Z');
});

test('feed date and time stay on the same UTC day and missing numbers never become zero', () => {
  const [event] = normalizeFeed([{ title: 'CPI', date: '2026-11-10T23:30:00-05:00', country: 'USD', actual: 0 }]);
  assert.equal(event.date, '2026-11-11'); assert.equal(event.time, '04:30'); assert.equal(event.actual, 0);
  for (const missing of ['—', 'N/A', '', null]) assert.equal(numericEventValue(missing), null);
  assert.equal(numericEventValue('1.2M'), 1_200_000);
  assert.equal(numericEventValue('900K'), 900_000);
  assert.equal(numericEventValue('0%'), 0);
  assert.equal(classifyEconomicEvent('Unemployment Rate'), 'jobs');
  assert.equal(classifyEconomicEvent('Federal Funds Rate'), 'rates');
  assert.equal(classifyEconomicEvent('Employment Cost Index q/q'), 'inflation');
  assert.equal(localizeMacroTitle('Non-Manufacturing PMI', 'es'), 'PMI no manufacturero');
  assert.equal(localizeMacroTitle('Federal Funds Rate', 'pt'), 'Taxa dos fundos federais');
  assert.equal(localizeMacroTitle('Core CPI m/m', 'es'), 'IPC subyacente m/m');
  assert.ok(localCalendarEvent(event).date);
  assert.equal(assetLabel({ name: 'S&P 500 (SPY)', symbol: 'SPY' }), 'S&P 500 (SPY)');
});
