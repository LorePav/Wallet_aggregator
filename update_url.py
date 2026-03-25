import os

directory = r"C:\Users\Lorenzo\.gemini\antigravity\scratch\wallet aggregator\frontend\src"
target = "http://localhost:8000"
replacement = "https://wallet-aggregator.onrender.com"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith((".jsx", ".js")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if target in content:
                content = content.replace(target, replacement)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {filepath}")
