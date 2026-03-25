import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state for displayCurrency
content = content.replace(
    "  const [refreshInterval, setRefreshInterval] = useState(() => {",
    "  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'EUR');\n  const [refreshInterval, setRefreshInterval] = useState(() => {"
)

# 2. Add handleCurrencyChange
content = content.replace(
    "  const handleIntervalChange = (e) => {",
    """  const handleCurrencyChange = (e) => {
    const val = e.target.value;
    setDisplayCurrency(val);
    localStorage.setItem('displayCurrency', val);
  };

  const handleIntervalChange = (e) => {"""
)

# 3. Add to Settings Modal
settings_html = """                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Valuta di Visualizzazione Globale</label>
                  <select
                    className="form-control"
                    value={displayCurrency}
                    onChange={handleCurrencyChange}
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollaro ($)</option>
                  </select>
                </div>"""
content = content.replace(
    "<h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Preferenze Generali</h3>",
    "<h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Preferenze Generali</h3>\n" + settings_html
)

# 4. Modify global calculations to respect displayCurrency
# Fix combinedPortfolio totals for USD
content = content.replace(
    "const totalValue = combinedPortfolio.reduce((acc, item) => acc + (item.current_value_eur !== undefined ? item.current_value_eur : item.current_value), 0);",
    "const totalValue = combinedPortfolio.reduce((acc, item) => acc + (displayCurrency === 'USD' ? (item.current_value_usd || item.current_value_eur || item.current_value) : (item.current_value_eur || item.current_value)), 0);"
)

content = content.replace(
    "const totalInvested = combinedPortfolio.reduce((acc, item) => acc + (item.total_invested_eur !== undefined ? item.total_invested_eur : item.total_invested), 0);",
    "const totalInvested = combinedPortfolio.reduce((acc, item) => acc + (displayCurrency === 'USD' ? (item.total_invested_usd || item.total_invested_eur || item.total_invested) : (item.total_invested_eur || item.total_invested)), 0);"
)

content = content.replace(
    "const val = arr.reduce((sum, item) => sum + (item.current_value_eur !== undefined ? item.current_value_eur : item.current_value), 0);",
    "const val = arr.reduce((sum, item) => sum + (displayCurrency === 'USD' ? (item.current_value_usd || item.current_value_eur || item.current_value) : (item.current_value_eur || item.current_value)), 0);"
)

# 5. Fix display of Totals (Net Worth cards)
content = content.replace(
    "<div className=\"value\">€{totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>",
    "<div className=\"value\">{formatCurrency(totalValue, displayCurrency)}</div>"
)

content = content.replace(
    "<div className=\"value\">€{totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>",
    "<div className=\"value\">{formatCurrency(totalInvested, displayCurrency)}</div>"
)

content = content.replace(
    "{totalGain >= 0 ? '+' : ''}€{totalGain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}",
    "{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain, displayCurrency)}"
)

# Let's fix also the tooltips and graph values that might be hardcoded to €
content = content.replace(
    "formatter={(value, name) => [`€${Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`",
    "formatter={(value, name) => [`${formatCurrency(Number(value), displayCurrency)}`"
)

content = content.replace(
    "tickFormatter={(value) => `€${value >= 1000",
    "tickFormatter={(value) => { const prefix = displayCurrency === 'USD' ? '$' : '€'; return `${prefix}${value >= 1000"
)

content = content.replace(
    "formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}",
    "formatter={(value) => `${formatCurrency(value, displayCurrency)}`}"
)

# Also fix the summary account deep dive calculations
# We need to make sure `formatCurrency` is called with displayCurrency
content = content.replace(
    "€{data.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}",
    "{formatCurrency(data.total, displayCurrency)}"
)

# And in selectedAccount breakdown logic 
# Actually data.total is calculated inside get_totals, let's fix that
content = content.replace(
    "const totalVal = portfolio.reduce((acc, item) => acc + (item.current_value_eur || item.current_value), 0) + totalLiq;",
    "const totalVal = portfolio.reduce((acc, item) => acc + (displayCurrency === 'USD' ? (item.current_value_usd || item.current_value_eur || item.current_value) : (item.current_value_eur || item.current_value)), 0) + totalLiq;"
)

content = content.replace(
    "const totalInv = portfolio.reduce((acc, item) => acc + (item.total_invested / (item.current_value / item.current_value_eur || 1)), 0) + totalLiq;",
    "const totalInv = portfolio.reduce((acc, item) => acc + (displayCurrency === 'USD' ? (item.total_invested_usd || item.total_invested_eur || item.total_invested) : (item.total_invested_eur || item.total_invested)), 0) + totalLiq;"
)

content = content.replace(
    "€{selectedAccount.data.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}",
    "{formatCurrency(selectedAccount.data.total, displayCurrency)}"
)
content = content.replace(
    "€{selectedAccount.data.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}",
    "{formatCurrency(selectedAccount.data.totalInvested, displayCurrency)}"
)


with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done applying Currency Toggle UI')
