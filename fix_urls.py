import os

path = r"C:\Users\Lorenzo\.gemini\antigravity\scratch\wallet aggregator\frontend\src"
for root, dirs, files in os.walk(path):
    for fn in files:
        if fn.endswith((".js", ".jsx")):
            fp = os.path.join(root, fn)
            with open(fp, "r", encoding="utf-8") as f:
                content = f.read()
            if "https://wallet-aggregator.onrender.com" in content:
                content = content.replace("https://wallet-aggregator.onrender.com", "http://127.0.0.1:8000")
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(content)
print("Sostituzioni completate nel frontend.")
