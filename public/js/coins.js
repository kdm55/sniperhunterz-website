/** Coin symbol → logo URL + initials fallback (display-safe). */

const COIN_LOGO_URLS = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  POL: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  ATOM: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  NEAR: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  APT: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  SUI: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
  INJ: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbolmark_Inverted.png",
  TIA: "https://assets.coingecko.com/coins/images/31967/small/tia.jpg",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  WIF: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  BONK: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
  HMSTR: "https://assets.coingecko.com/coins/images/40094/small/hamster_kombat_logo.jpg",
};

function symbolKey(coin) {
  const raw = coin.symbol_display || coin.symbol || "";
  return String(raw)
    .toUpperCase()
    .replace(/-USDT-SWAP$/i, "")
    .replace(/\/USDT$/i, "")
    .replace(/-USDT$/i, "")
    .trim();
}

function coinLogoUrl(coin) {
  const key = symbolKey(coin);
  if (COIN_LOGO_URLS[key]) return COIN_LOGO_URLS[key];
  const slug = key.toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${slug}.png`;
}

function coinInitials(coin) {
  const key = symbolKey(coin);
  return key.slice(0, 2) || "?";
}

window.Coins = {
  symbolKey,
  coinLogoUrl,
  coinInitials,
  COIN_LOGO_URLS,
};
