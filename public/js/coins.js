/** Coin symbol → logo URL + initials (scan payload + multi-CDN fallbacks). */

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
  SPACE: "https://assets.coingecko.com/coins/images/50882/small/hamster-kombat.jpeg",
};

const SYMBOL_ALIASES = {
  "1000PEPE": "PEPE",
  "1000BONK": "BONK",
  "1000FLOKI": "FLOKI",
  "1000SHIB": "SHIB",
  "1000SATS": "SATS",
  "1000RATS": "RATS",
  "1000LUNC": "LUNC",
  "1000XEC": "XEC",
  "1000CAT": "CAT",
  "1000WHY": "WHY",
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

function displayKey(coin) {
  const key = symbolKey(coin);
  return SYMBOL_ALIASES[key] || key;
}

function logoUrlCandidates(coin) {
  const out = [];
  const add = (url) => {
    const u = String(url || "").trim();
    if (u && out.indexOf(u) === -1) out.push(u);
  };
  add(coin.coin_logo_url || coin.logo_url);
  const key = displayKey(coin);
  add(COIN_LOGO_URLS[key]);
  const slug = key.toLowerCase();
  if (slug) {
    add(`https://assets.coincap.io/assets/icons/${slug}@2x.png`);
    add(
      `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${slug}.png`
    );
    add(
      `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/icon/${slug}.png`
    );
  }
  return out;
}

function coinLogoUrl(coin) {
  const urls = logoUrlCandidates(coin);
  return urls[0] || "";
}

function coinInitials(coin) {
  const key = displayKey(coin);
  return key.slice(0, 2) || "?";
}

function _logoImgError(img) {
  const raw = img.getAttribute("data-logo-fallbacks");
  if (!raw) {
    img.remove();
    return;
  }
  let rest;
  try {
    rest = JSON.parse(decodeURIComponent(raw));
  } catch (_e) {
    img.remove();
    return;
  }
  if (!Array.isArray(rest) || !rest.length) {
    img.remove();
    return;
  }
  const next = rest.shift();
  img.setAttribute("data-logo-fallbacks", encodeURIComponent(JSON.stringify(rest)));
  img.src = next;
}

function coinLogoImgTag(coin) {
  const urls = logoUrlCandidates(coin);
  if (!urls.length) return "";
  const [first, ...rest] = urls;
  const safeSrc = String(first).replace(/"/g, "&quot;");
  const fb = rest.length
    ? ` data-logo-fallbacks="${encodeURIComponent(JSON.stringify(rest))}"`
    : "";
  return `<img src="${safeSrc}" alt="" loading="lazy"${fb} onerror="window.Coins&&Coins._logoImgError(this)"/>`;
}

window.Coins = {
  symbolKey,
  displayKey,
  coinLogoUrl,
  logoUrlCandidates,
  coinInitials,
  coinLogoImgTag,
  _logoImgError,
  COIN_LOGO_URLS,
  SYMBOL_ALIASES,
};
