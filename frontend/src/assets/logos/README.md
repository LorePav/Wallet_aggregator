# Loghi locali degli asset

Metti qui i loghi ufficiali degli asset che vuoi mostrare senza dipendere da servizi esterni.

## Regola di naming

Il nome del file deve essere **il simbolo dell'asset in maiuscolo**, con l'estensione dell'immagine:

```
KAMINO.png
IWDA.AS.png
BTC.png
```

Formati supportati: `png`, `svg`, `jpg`, `jpeg`, `webp`.

Il componente `AssetIcon` li carica automaticamente: non serve modificare il codice.
I file locali hanno sempre la priorità sui provider remoti.

## Note

- Per le crypto puoi usare sia il simbolo base (`BTC.png`) sia la coppia (`BTCUSD.png`): il simbolo base viene cercato come fallback.
- Per i farming/protocolli DeFi (es. Kamino) questa cartella è l'unico modo affidabile per avere il logo.
- Se non trovi un logo, l'app mostra comunque un cerchio colorato con l'iniziale del simbolo.
