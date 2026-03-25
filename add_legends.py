import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we import Legend from recharts
if 'Legend' not in content[:500]:
    content = content.replace(
        "AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'", 
        "AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'"
    )

# 1. Add state for hidden pie slices
old_state = "  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'EUR');"
new_state = """  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'EUR');
  const [hiddenAssets, setHiddenAssets] = useState({});
  const [hiddenCategories, setHiddenCategories] = useState({});"""
content = content.replace(old_state, new_state)

# 2. Add click handlers for legends
old_handlers = "  const handleCurrencyChange = (e) => {"
new_handlers = """  const handleAssetLegendClick = (data) => {
    setHiddenAssets(prev => ({
      ...prev,
      [data.value]: !prev[data.value]
    }));
  };

  const handleCategoryLegendClick = (data) => {
    setHiddenCategories(prev => ({
      ...prev,
      [data.value]: !prev[data.value]
    }));
  };

  const handleCurrencyChange = (e) => {"""
content = content.replace(old_handlers, new_handlers)

# 3. Add Legend to Asset PieChart and filter data
old_pie1 = "<PieChart>"
new_pie1 = """<PieChart>
                        <Legend
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
content = content.replace(old_pie1, new_pie1, 1)

old_pie1_tag = '<Pie data={assetData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">'
new_pie1_tag = '<Pie data={assetData.filter(d => !hiddenAssets[d.name])} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">'
content = content.replace(old_pie1_tag, new_pie1_tag)

# 4. Add Legend to Category PieChart and filter data
old_pie2 = "<PieChart>"
new_pie2 = """<PieChart>
                        <Legend
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
content = content.replace(old_pie2, new_pie2, 1)

old_pie2_tag = '<Pie data={categoryData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">'
new_pie2_tag = '<Pie data={categoryData.filter(d => !hiddenCategories[d.name])} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">'
content = content.replace(old_pie2_tag, new_pie2_tag)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Legends applied successfully to App.jsx!")
