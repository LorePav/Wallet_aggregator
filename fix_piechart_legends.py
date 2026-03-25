import sys
import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove ALL existing <Legend> tags to start clean
content = re.sub(r'\s*<Legend[\s\S]*?</Legend>', '', content)

# 2. Define exactly the two new Legends
asset_legend = """
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="left"
                        content={(props) => (
                          <CustomLegend 
                            {...props} 
                            payload={assetData.map((item, index) => ({ 
                              value: item.name, 
                              color: COLORS[index % COLORS.length] 
                            }))}
                            hiddenItems={hiddenAssets} 
                            onToggle={(val) => handleAssetLegendClick({ value: val })}
                          />
                        )}
                      />"""

cat_legend = """
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="left"
                        content={(props) => (
                          <CustomLegend 
                            {...props} 
                            payload={categoryData.map((item, index) => ({ 
                              value: item.name, 
                              color: COLORS[(index + 3) % COLORS.length] 
                            }))}
                            hiddenItems={hiddenCategories} 
                            onToggle={(val) => handleCategoryLegendClick({ value: val })}
                          />
                        )}
                      />"""

# 3. Inject them properly right before the corresponding <Pie> component starts
content = content.replace('<Pie data={assetData.filter', asset_legend + '\n                      <Pie data={assetData.filter')
content = content.replace('<Pie data={categoryData.filter', cat_legend + '\n                      <Pie data={categoryData.filter')

# 4. Fix color index shifting when filtering
# Look for the Cell mapping logic inside the two Pie components.
# It currently looks roughly like:
# {assetData.filter(...).map((entry, index) => (
#   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
# ))}

asset_cell_pattern = r'\{assetData\.filter\([\s\S]*?<Cell[\s\S]*?\)\s*\}'
new_asset_cell = """
                        {assetData.filter(d => !hiddenAssets[d.name]).map((entry) => {
                          const originalIndex = assetData.findIndex(x => x.name === entry.name);
                          return <Cell key={`cell-asset-${originalIndex}`} fill={COLORS[originalIndex % COLORS.length]} />;
                        })}
"""
content = re.sub(asset_cell_pattern, new_asset_cell.strip(), content)


category_cell_pattern = r'\{categoryData\.filter\([\s\S]*?<Cell[\s\S]*?\)\s*\}'
new_category_cell = """
                        {categoryData.filter(d => !hiddenCategories[d.name]).map((entry) => {
                          const originalIndex = categoryData.findIndex(x => x.name === entry.name);
                          return <Cell key={`cell-cat-${originalIndex}`} fill={COLORS[(originalIndex + 3) % COLORS.length]} />;
                        })}
"""
content = re.sub(category_cell_pattern, new_category_cell.strip(), content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done fixing PieCharts! The legends are separated and the color mapping matches the original index.')
