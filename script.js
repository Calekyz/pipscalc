// ----------------------------------------------
//  DOM references
// ----------------------------------------------
const pairSelect = document.getElementById('pair');
const lotSizeInput = document.getElementById('lotSize');
const accountCurrencySelect = document.getElementById('accountCurrency');
const entryPriceInput = document.getElementById('entryPrice');
const exitPriceInput = document.getElementById('exitPrice');
const conversionRateInput = document.getElementById('conversionRate');
const rateHint = document.getElementById('rateHint');

const pipDiffEl = document.getElementById('pipDiff');
const pipValueEl = document.getElementById('pipValue');
const totalPnLEl = document.getElementById('totalPnL');

const balanceInput = document.getElementById('balance');
const riskPercentInput = document.getElementById('riskPercent');
const stopLossPipsInput = document.getElementById('stopLossPips');
const recommendedLotsEl = document.getElementById('recommendedLots');
const riskAmountEl = document.getElementById('riskAmount');

// ----------------------------------------------
//  Helpers
// ----------------------------------------------
function getPipSize(pair) {
  // JPY pairs and XAUUSD (Gold) use 0.01 as 1 pip
  if (pair.endsWith('JPY') || pair === 'XAUUSD') {
    return 0.01;
  }
  return 0.0001;
}

function getQuoteCurrency(pair) {
  // e.g. "EURUSD" -> "USD"
  return pair.slice(3);
}

function formatCurrency(value, currency = '') {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}${abs.toFixed(2)} ${currency}`.trim();
  if (abs >= 1) return `${sign}${abs.toFixed(4)} ${currency}`.trim();
  return `${sign}${abs.toFixed(6)} ${currency}`.trim();
}

function getNumber(id) {
  const val = parseFloat(document.getElementById(id).value);
  return isNaN(val) ? 0 : val;
}

// ----------------------------------------------
//  Main calculation: Pip & Profit
// ----------------------------------------------
function calculatePipProfit() {
  const pair = pairSelect.value;
  const lotSize = getNumber('lotSize');
  const accountCurrency = accountCurrencySelect.value;
  const entry = getNumber('entryPrice');
  const exit = getNumber('exitPrice');
  const rate = getNumber('conversionRate'); // 1 quote currency = ? account currency

  if (lotSize <= 0 || entry <= 0 || exit <= 0 || rate <= 0) {
    pipDiffEl.textContent = '—';
    pipValueEl.textContent = '—';
    totalPnLEl.textContent = '—';
    totalPnLEl.className = 'result-value';
    return;
  }

  const pipSize = getPipSize(pair);
  const units = lotSize * 100000;

  // 1. Pip difference
  const pipDiff = (exit - entry) / pipSize;

  // 2. Profit in Quote Currency
  const profitInQuote = (exit - entry) * units;

  // 3. Profit in Account Currency
  const profitInAccount = profitInQuote * rate;

  // 4. Pip Value per lot in Account Currency
  //    (1 lot = 100,000 units)
  const pipValuePerLot = (pipSize * 100000) * rate;

  // Format outputs
  const isProfit = profitInAccount >= 0;
  const sign = isProfit ? '+' : '';

  pipDiffEl.textContent = `${sign}${pipDiff.toFixed(1)} pips`;
  pipValueEl.textContent = `${formatCurrency(pipValuePerLot, accountCurrency)} / lot`;

  totalPnLEl.textContent = `${formatCurrency(profitInAccount, accountCurrency)}`;
  totalPnLEl.className = 'result-value ' + (isProfit ? 'positive' : 'negative');

  // Also store the current pip value per lot globally for the position sizing tab
  window._lastPipValuePerLot = pipValuePerLot;
}

// ----------------------------------------------
//  Position Size (Risk Management)
// ----------------------------------------------
function calculatePositionSize() {
  const balance = getNumber('balance');
  const riskPercent = getNumber('riskPercent');
  const stopLoss = getNumber('stopLossPips');
  const pipValuePerLot = window._lastPipValuePerLot || 0;

  if (balance <= 0 || riskPercent <= 0 || stopLoss <= 0 || pipValuePerLot <= 0) {
    recommendedLotsEl.textContent = '—';
    riskAmountEl.textContent = '—';
    return;
  }

  const riskAmount = balance * (riskPercent / 100);
  // Lots = RiskAmount / (StopLossPips * PipValuePerLot)
  const lots = riskAmount / (stopLoss * pipValuePerLot);

  recommendedLotsEl.textContent = lots.toFixed(4);
  riskAmountEl.textContent = formatCurrency(riskAmount, document.getElementById('accountCurrency').value);
}

// ----------------------------------------------
//  Auto-update hint for conversion rate
// ----------------------------------------------
function updateRateHint() {
  const pair = pairSelect.value;
  const account = accountCurrencySelect.value;
  const quote = getQuoteCurrency(pair);

  if (quote === account) {
    rateHint.textContent = '✅ Same as account currency → rate = 1.0000';
    conversionRateInput.value = 1.0000;
  } else {
    rateHint.textContent =
      `e.g. 1 ${quote} = ? ${account}  (if ${pair} = 1.10, then 1 ${quote} = ${(1 / 1.10).toFixed(4)} ${account})`;
  }
}

// ----------------------------------------------
//  Event listeners – recalculate on any change
// ----------------------------------------------
const allInputs = [
  pairSelect,
  lotSizeInput,
  accountCurrencySelect,
  entryPriceInput,
  exitPriceInput,
  conversionRateInput,
  balanceInput,
  riskPercentInput,
  stopLossPipsInput,
];

allInputs.forEach((el) => {
  el.addEventListener('input', () => {
    calculatePipProfit();
    calculatePositionSize();
  });
  el.addEventListener('change', () => {
    calculatePipProfit();
    calculatePositionSize();
  });
});

// Special: when pair or account changes, update the hint and auto-set rate if same
pairSelect.addEventListener('change', updateRateHint);
accountCurrencySelect.addEventListener('change', updateRateHint);

// ----------------------------------------------
//  Initialise
// ----------------------------------------------
updateRateHint();
calculatePipProfit();
calculatePositionSize();
