import sys
import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Asset Pie:
bad_asset_block = r'<Pie data=\{assetData\.filter\(d => !hiddenAssets\[d\.name\]\)\.map\(\(entry\) => \{\s*const originalIndex = assetData\.findIndex\(x => x\.name === entry\.name\);\s*return <Cell key=\{`cell-asset-\$\{originalIndex\}`\} fill=\{COLORS\[originalIndex % COLORS\.length\]\} />;\s*\}\)\s*\}'

new_asset_block = '''<Pie data={assetData.filter(d => !hiddenAssets[d.name])} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {assetData.filter(d => !hiddenAssets[d.name]).map((entry) => {
                          const originalIndex = assetData.findIndex(x => x.name === entry.name);
                          return <Cell key={`cell-asset-${originalIndex}`} fill={COLORS[originalIndex % COLORS.length]} />;
                        })}'''

content = re.sub(bad_asset_block, new_asset_block, content)

# Category Pie:
bad_cat_block = r'<Pie data=\{categoryData\.filter\(d => !hiddenCategories\[d\.name\]\)\.map\(\(entry\) => \{\s*const originalIndex = categoryData\.findIndex\(x => x\.name === entry\.name\);\s*return <Cell key=\{`cell-cat-\$\{originalIndex\}`\} fill=\{COLORS\[\(originalIndex \+ 3\) % COLORS\.length\]\} />;\s*\}\)\s*\}'

new_cat_block = '''<Pie data={categoryData.filter(d => !hiddenCategories[d.name])} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {categoryData.filter(d => !hiddenCategories[d.name]).map((entry) => {
                          const originalIndex = categoryData.findIndex(x => x.name === entry.name);
                          return <Cell key={`cell-cat-${originalIndex}`} fill={COLORS[(originalIndex + 3) % COLORS.length]} />;
                        })}'''

content = re.sub(bad_cat_block, new_cat_block, content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('JSX Pie bounds fixed!')
