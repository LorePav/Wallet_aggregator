import os
import re

path = r"C:\Users\Lorenzo\.gemini\antigravity\scratch\wallet aggregator\frontend\src"

for root, dirs, files in os.walk(path):
    for fn in files:
        if fn.endswith((".js", ".jsx")):
            fp = os.path.join(root, fn)
            with open(fp, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Sostituisce 'http://127.0.0.1:8000/...' con `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/...`
            new_content = re.sub(
                r"(?P<q>['\"`])http://127\.0\.0\.1:8000(?P<tail>.*?)(?P=q)",
                r"`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}\g<tail>`",
                content
            )
            
            if content != new_content:
                print(f"Aggiornato file: {fn}")
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(new_content)
print("Sostituzioni API completate nel frontend.")
