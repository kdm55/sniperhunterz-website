/** Fetch display-sync — normalized payload, diagnostics, timeout (never hang forever). */

const STALE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

const Api = {
  _cache: null,
  _updatedAt: null,
  _raw: null,
  _diag: {
    phase: "idle",
    httpStatus: null,
    error: null,
    keys: [],
    fetchedAt: null,
  },

  diagnostics() {
    return { ...this._diag };
  },

  /** Accept { payload: {...} } or bare payload at root. */
  normalizePayload(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const inner = data.payload;
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      return inner;
    }
    if (
      data.top_coins ||
      data.top_10_coins ||
      data.ranked_candidates ||
      data.regime ||
      data.stats ||
      data.performance
    ) {
      return data;
    }
    return inner && typeof inner === "object" ? inner : null;
  },

  async load(force = false) {
    if (this._cache && !force) {
      this._diag.phase = "cached";
      return {
        ok: true,
        updated_at: this._updatedAt,
        payload: this._cache,
        fromCache: true,
      };
    }

    this._diag.phase = "fetching";
    this._diag.error = null;
    this._diag.httpStatus = null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const r = await fetch("/api/display-sync", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      clearTimeout(timer);

      this._diag.httpStatus = r.status;
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        this._diag.phase = "fetch_failed";
        this._diag.error = `Invalid JSON (${parseErr.message})`;
        throw new Error(this._diag.error);
      }

      this._raw = data;
      const payload = this.normalizePayload(data);
      this._updatedAt =
        data.updated_at || payload?.synced_at || new Date().toISOString();
      this._cache = payload;
      this._diag.keys = payload
        ? Object.keys(payload).slice(0, 40)
        : Object.keys(data).slice(0, 40);
      this._diag.fetchedAt = new Date().toISOString();

      if (!r.ok) {
        this._diag.phase = "fetch_failed";
        this._diag.error =
          data.error || data.message || `HTTP ${r.status}`;
        return {
          ok: false,
          updated_at: this._updatedAt,
          payload: null,
          raw: data,
          httpStatus: r.status,
          error: this._diag.error,
        };
      }

      if (payload) {
        this._diag.phase = "fetch_success";
      } else {
        this._diag.phase = "payload_empty";
        this._diag.error = data.message || "No payload in response";
      }

      return {
        ok: Boolean(payload),
        updated_at: this._updatedAt,
        payload,
        raw: data,
        httpStatus: r.status,
      };
    } catch (e) {
      clearTimeout(timer);
      this._diag.phase = "fetch_failed";
      this._diag.error =
        e.name === "AbortError"
          ? `Timed out after ${FETCH_TIMEOUT_MS / 1000}s`
          : String(e.message || e);
      throw e;
    }
  },

  staleMinutes() {
    if (!this._updatedAt) return null;
    const age = Date.now() - new Date(this._updatedAt).getTime();
    if (Number.isNaN(age)) return null;
    return Math.floor(age / 60000);
  },

  isStale() {
    if (!this._updatedAt) return true;
    const age = Date.now() - new Date(this._updatedAt).getTime();
    return age > STALE_MS;
  },

  payload() {
    return this._cache;
  },

  updatedAt() {
    return this._updatedAt;
  },
};

window.Api = Api;
