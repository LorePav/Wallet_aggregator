from finance import get_historical_prices, get_live_prices
print(get_live_prices(["STLAM"]))
print(get_historical_prices("STLAM", "5d"))
