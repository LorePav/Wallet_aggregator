import sys

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_legend = """const CustomLegend = (props) => {
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
};"""

new_legend = """const CustomLegend = (props) => {
  const { payload, hiddenItems, onToggle } = props;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
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
              padding: '4px 8px',
              borderRadius: '12px',
              border: `1px solid ${isHidden ? '#444' : color}`,
              backgroundColor: isHidden ? 'transparent' : `${color}20`,
              color: isHidden ? '#888' : '#fff',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: isHidden ? 'none' : `0 1px 4px ${color}40`,
              width: 'fit-content'
            }}
          >
            <span style={{ 
              display: 'inline-block', 
              width: '6px', 
              height: '6px', 
              backgroundColor: isHidden ? '#555' : color, 
              borderRadius: '50%' 
            }}></span>
            {entry.value}
          </button>
        );
      })}
    </div>
  );
};"""

content = content.replace(old_legend, new_legend)

content = content.replace(
'''<Legend
                          verticalAlign="bottom"
                          content={(props) => (''',
'''<Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="left"
                          content={(props) => (''', 1)

content = content.replace(
'''<Legend
                          verticalAlign="bottom"
                          content={(props) => (''',
'''<Legend
                          layout="vertical"
                          verticalAlign="middle"
                          align="left"
                          content={(props) => (''', 1)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Legends layout!')
