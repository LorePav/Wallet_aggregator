import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

custom_legend_code = """
const CustomLegend = (props) => {
  const { payload, hiddenItems, onToggle } = props;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', paddingTop: '15px' }}>
      {payload.map((entry, index) => {
        const isHidden = hiddenItems[entry.value];
        const color = entry.color;
        return (
          <button
            key={`item-${index}`}
            onClick={(e) => {
              e.preventDefault();
              onToggle(entry.value);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1px solid ${isHidden ? '#444' : color}`,
              backgroundColor: isHidden ? 'transparent' : `${color}20`,
              color: isHidden ? '#888' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: isHidden ? 'none' : `0 2px 8px ${color}40`,
            }}
          >
            <span style={{ 
              display: 'inline-block', 
              width: '10px', 
              height: '10px', 
              backgroundColor: isHidden ? '#555' : color, 
              borderRadius: '50%' 
            }}></span>
            {entry.value}
          </button>
        );
      })}
    </div>
  );
};

function App() {"""

content = content.replace("function App() {", custom_legend_code)

old_asset_legend = """<Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px", cursor: "pointer" }}
                          onClick={handleAssetLegendClick}
                          payload={
                            assetData.map((item, index) => ({
                              id: item.name,
                              type: "square",
                              value: item.name,
                              color: hiddenAssets[item.name] ? "rgba(255,255,255,0.2)" : COLORS[index % COLORS.length]
                            }))
                          }
                        />"""

new_asset_legend = """<Legend
                          verticalAlign="bottom"
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

content = content.replace(old_asset_legend, new_asset_legend)

old_category_legend = """<Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px", cursor: "pointer" }}
                          onClick={handleCategoryLegendClick}
                          payload={
                            categoryData.map((item, index) => ({
                              id: item.name,
                              type: "square",
                              value: item.name,
                              color: hiddenCategories[item.name] ? "rgba(255,255,255,0.2)" : COLORS[(index + 3) % COLORS.length]
                            }))
                          }
                        />"""

new_category_legend = """<Legend
                          verticalAlign="bottom"
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

content = content.replace(old_category_legend, new_category_legend)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Custom legends created successfully!")
