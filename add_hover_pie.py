import sys
import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CustomLegend to accept onMouseEnter/onMouseLeave
old_legend_def = """const CustomLegend = (props) => {
  const { payload, hiddenItems, onToggle } = props;"""

new_legend_def = """const CustomLegend = (props) => {
  const { payload, hiddenItems, onToggle, onHover, onHoverLeave } = props;"""
content = content.replace(old_legend_def, new_legend_def)

# 2. Add mouse events to the button in CustomLegend
old_button_start = """          <button
            key={`item-${index}`}
            onClick={(e) => {"""

new_button_start = """          <button
            key={`item-${index}`}
            onMouseEnter={() => onHover && onHover(entry.value)}
            onMouseLeave={() => onHoverLeave && onHoverLeave()}
            onClick={(e) => {"""
content = content.replace(old_button_start, new_button_start)

# 3. Add hover states to App component
old_state = "  const [hiddenCategories, setHiddenCategories] = useState({});"
new_state = """  const [hiddenCategories, setHiddenCategories] = useState({});
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);"""
content = content.replace(old_state, new_state)

# 4. Pass hover handlers to the Legends
# Asset Legend
asset_legend_regex = r'(<CustomLegend[\s\S]*?hiddenItems=\{hiddenAssets\}[\s\S]*?onToggle=\{\(val\) => handleAssetLegendClick\(\{ value: val \}\)\}\s*/>)'
asset_legend_replacement = r'''<CustomLegend 
                              {...props} 
                              payload={assetData.map((item, index) => ({ 
                                value: item.name, 
                                color: COLORS[index % COLORS.length] 
                              }))}
                              hiddenItems={hiddenAssets} 
                              onToggle={(val) => handleAssetLegendClick({ value: val })}
                              onHover={(val) => setHoveredAsset(val)}
                              onHoverLeave={() => setHoveredAsset(null)}
                            />'''
# Quick manual replace for CustomLegend blocks since regex can be finicky with props spreading
content = content.replace("hiddenItems={hiddenAssets} \n                              onToggle={(val) => handleAssetLegendClick({ value: val })}\n                            />", "hiddenItems={hiddenAssets} \n                              onToggle={(val) => handleAssetLegendClick({ value: val })}\n                              onHover={(val) => setHoveredAsset(val)}\n                              onHoverLeave={() => setHoveredAsset(null)}\n                            />")
content = content.replace("hiddenItems={hiddenCategories} \n                              onToggle={(val) => handleCategoryLegendClick({ value: val })}\n                            />", "hiddenItems={hiddenCategories} \n                              onToggle={(val) => handleCategoryLegendClick({ value: val })}\n                              onHover={(val) => setHoveredCategory(val)}\n                              onHoverLeave={() => setHoveredCategory(null)}\n                            />")

# 5. Make the pie slices react to the hover state
# We can do this by setting a different outerRadius or dynamically changing the cell opacity/stroke if it's the hovered one.
# For Recharts <Pie>, we can actually just define an `activeIndex` and a slightly larger active shape, OR we can just inject inline style changes into the <Cell>.
# Let's change the Cell opacity based on hover: If something is hovered, fade the others slightly, and optionally expand stroke width.

old_asset_cell = "return <Cell key={`cell-asset-${originalIndex}`} fill={COLORS[originalIndex % COLORS.length]} />;"
new_asset_cell = """
                          const isHovered = hoveredAsset === entry.name;
                          const opacity = hoveredAsset ? (isHovered ? 1 : 0.4) : 1;
                          const transform = isHovered ? 'scale(1.05)' : 'scale(1)';
                          return (
                            <Cell 
                              key={`cell-asset-${originalIndex}`} 
                              fill={COLORS[originalIndex % COLORS.length]} 
                              opacity={opacity}
                              stroke={isHovered ? '#fff' : 'none'}
                              strokeWidth={isHovered ? 2 : 0}
                              style={{ transformOrigin: 'center', transform, transition: 'all 0.3s ease' }}
                            />
                          );
"""
content = content.replace(old_asset_cell, new_asset_cell.strip())

old_cat_cell = "return <Cell key={`cell-cat-${originalIndex}`} fill={COLORS[(originalIndex + 3) % COLORS.length]} />;"
new_cat_cell = """
                          const isHovered = hoveredCategory === entry.name;
                          const opacity = hoveredCategory ? (isHovered ? 1 : 0.4) : 1;
                          const transform = isHovered ? 'scale(1.05)' : 'scale(1)';
                          return (
                            <Cell 
                              key={`cell-cat-${originalIndex}`} 
                              fill={COLORS[(originalIndex + 3) % COLORS.length]} 
                              opacity={opacity}
                              stroke={isHovered ? '#fff' : 'none'}
                              strokeWidth={isHovered ? 2 : 0}
                              style={{ transformOrigin: 'center', transform, transition: 'all 0.3s ease' }}
                            />
                          );
"""
content = content.replace(old_cat_cell, new_cat_cell.strip())

# Overriding Pie active shape can be complex in Recharts unless we know exactly the shape, but simple CSS transform/opacity on <Cell> usually works wonderfully in SVG.

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Hover logic injected!')
