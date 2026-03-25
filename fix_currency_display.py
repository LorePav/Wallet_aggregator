import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make formatCurrency useful
old_format = """  const formatCurrency = (amount, currencyCode) => {
    const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥' };
    const sym = symbols[currencyCode] || currencyCode + ' ';
    return `${sym}${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
  };"""

new_format = """  const formatCurrency = (amount, currencyCode, maxFract = 2) => {
    if (amount === undefined || amount === null) return '';
    const symbols = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥' };
    const sym = symbols[currencyCode] || currencyCode + ' ';
    return `${sym}${amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: maxFract })}`;
  };"""

content = content.replace(old_format, new_format)

# Asset table modifications
content = content.replace("<td>€{item.pmc.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>", "<td>{formatCurrency(item.pmc, item.currency, 4)}</td>")
content = content.replace("<td>€{item.live_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>", "<td>{formatCurrency(item.live_price, item.currency, 4)}</td>")

# Be careful with replacing '€{item.current_value...' and '€{item.unrealized_gain...'
content = content.replace("€{item.current_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}", "{formatCurrency(item.current_value, item.currency)}")
content = content.replace("€{item.unrealized_gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}", "{formatCurrency(item.unrealized_gain, item.currency)}")

# Summary grids (for individual assets modale) lines 903, 911, 915, 920
content = content.replace("€{selectedAsset.live_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}", "{formatCurrency(selectedAsset.live_price, selectedAsset.currency, 4)}")
content = content.replace("€{selectedAsset.pmc.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}", "{formatCurrency(selectedAsset.pmc, selectedAsset.currency, 4)}")
content = content.replace("€{selectedAsset.current_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}", "{formatCurrency(selectedAsset.current_value, selectedAsset.currency)}")
content = content.replace("€{selectedAsset.unrealized_gain.toLocaleString('it-IT', { minimumFractionDigits: 2 })}", "{formatCurrency(selectedAsset.unrealized_gain, selectedAsset.currency)}")


with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
