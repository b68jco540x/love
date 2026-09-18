import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchJikanJson, JIKAN_BASE_URL } from "./helpers.js";

describe("fetchJikanJson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed json on first successful fetch", async () => {
    const mockData = { data: [{ malId: 20, title: "Naruto" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    }));

    const res = await fetchJikanJson<{ data: any[] }>("https://jikan-edge.lucas-hdo.workers.dev/v1/anime?q=naruto");
    expect(res).toEqual(mockData);
  });

  it("retries when fetch fails and returns data on subsequent attempt", async () => {
    const mockData = { data: [{ malId: 20, title: "Naruto" }] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 504, statusText: "Gateway Timeout" })
      .mockResolvedValueOnce({ ok: true, json: async () => mockData });

    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchJikanJson<{ data: any[] }>("https://jikan-edge.lucas-hdo.workers.dev/v1/anime?q=naruto", 2, 10);
    expect(res).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null after max retries are exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 504, statusText: "Gateway Timeout" });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchJikanJson("https://jikan-edge.lucas-hdo.workers.dev/v1/anime?q=naruto", 1, 10);
    expect(res).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2); // attempt 0 + attempt 1
  });

  it("fetches live data successfully from Jikan Edge API", async () => {
    const res = await fetchJikanJson<{ data?: any[] }>(`${JIKAN_BASE_URL}/anime?q=Naruto`);
    expect(res).not.toBeNull();
    expect(res?.data).toBeDefined();
    expect(Array.isArray(res?.data)).toBe(true);
    expect(res!.data!.length).toBeGreaterThan(0);
  });
});
