import { useEffect, useRef, useState } from "react";

// Real-time BTC price.
// 1st choice: Binance WebSocket (pushes a new 24h ticker every second).
// Fallback:   Coinbase REST API polled every 5 seconds.
const BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@ticker";
const COINBASE_STATS = "https://api.exchange.coinbase.com/products/BTC-USD/stats";
const COINBASE_TICKER = "https://api.exchange.coinbase.com/products/BTC-USD/ticker";
const MAX_TICKS = 180;

export function useLivePrice() {
  const [state, setState] = useState({
    price: null,
    open24h: null,
    high24h: null,
    low24h: null,
    volume24h: null,
    quoteVolume24h: null,
    changePct: null,
    direction: 0,
    source: "connecting",
    updatedAt: null,
    ticks: [],
  });
  const lastPrice = useRef(null);

  useEffect(() => {
    let ws;
    let pollTimer;
    let closed = false;

    const push = (data, source) => {
      const prev = lastPrice.current;
      lastPrice.current = data.price;
      setState((s) => ({
        ...s,
        ...data,
        source,
        direction: prev == null ? 0 : Math.sign(data.price - prev),
        updatedAt: new Date(),
        ticks: [...s.ticks, { t: Date.now(), p: data.price }].slice(-MAX_TICKS),
      }));
    };

    const startPolling = () => {
      if (pollTimer || closed) return;
      const poll = async () => {
        try {
          const [stats, ticker] = await Promise.all([
            fetch(COINBASE_STATS).then((r) => r.json()),
            fetch(COINBASE_TICKER).then((r) => r.json()),
          ]);
          const price = parseFloat(ticker.price);
          const open = parseFloat(stats.open);
          push(
            {
              price,
              open24h: open,
              high24h: parseFloat(stats.high),
              low24h: parseFloat(stats.low),
              volume24h: parseFloat(stats.volume),
              quoteVolume24h: parseFloat(stats.volume) * price,
              changePct: ((price - open) / open) * 100,
            },
            "Coinbase",
          );
        } catch {
          setState((s) => ({ ...s, source: s.price ? s.source : "offline" }));
        }
      };
      poll();
      pollTimer = setInterval(poll, 5000);
    };

    try {
      ws = new WebSocket(BINANCE_WS);
      const failTimer = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startPolling();
        }
      }, 5000);
      ws.onmessage = (ev) => {
        const d = JSON.parse(ev.data);
        push(
          {
            price: parseFloat(d.c),
            open24h: parseFloat(d.o),
            high24h: parseFloat(d.h),
            low24h: parseFloat(d.l),
            volume24h: parseFloat(d.v),
            quoteVolume24h: parseFloat(d.q),
            changePct: parseFloat(d.P),
          },
          "Binance",
        );
      };
      ws.onopen = () => clearTimeout(failTimer);
      ws.onerror = () => startPolling();
      ws.onclose = () => !closed && startPolling();
    } catch {
      startPolling();
    }

    return () => {
      closed = true;
      ws?.close();
      clearInterval(pollTimer);
    };
  }, []);

  return state;
}
