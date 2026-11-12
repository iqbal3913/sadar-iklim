"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DemoUser, Report, ReportStatus } from "./types";
import { emptyLiveData, getLiveSnapshot, getScenarioSnapshot, mergeLive, type LiveData, type Snapshot } from "./data";

type Mode = "LIVE" | "SIMULATION";

interface Persisted {
  mode: Mode;
  scenarioCode: string;
  adm4: string | null;
  user: DemoUser | null;
  addedReports: Report[];
  overrides: Record<string, { status: ReportStatus; reviewNote: string }>;
}

const defaults: Persisted = {
  mode: "LIVE",
  scenarioCode: "ROB-URBAN-01",
  adm4: null,
  user: null,
  addedReports: [],
  overrides: {},
};

const storageKey = "sadariklim-demo-state";

interface AppState extends Persisted {
  ready: boolean;
  snapshot: Snapshot;
  setMode: (mode: Mode) => void;
  setScenario: (code: string) => void;
  setAdm4: (adm4: string | null) => void;
  login: (user: DemoUser) => void;
  logout: () => void;
  addReport: (report: Report) => void;
  reviewReport: (id: string, status: ReportStatus, note: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppState | null>(null);

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.status === "ERROR") {
    throw new Error(body?.message ?? "Sumber tidak dapat dijangkau");
  }
  return body;
}

async function loadLive(adm4: string | null): Promise<LiveData> {
  const errors: LiveData["errors"] = {};
  const fail = (key: keyof LiveData["errors"]) => (e: unknown) => {
    errors[key] = e instanceof Error ? e.message : "Sumber tidak dapat dijangkau";
    return null;
  };
  const [f, q] = await Promise.all([
    getJson(adm4 ? `/api/bmkg/forecast?adm4=${encodeURIComponent(adm4)}` : "/api/bmkg/forecast").catch(fail("forecast")),
    getJson("/api/bmkg/earthquakes").catch(fail("earthquakes")),
  ]);
  const a = await getJson(`/api/bmkg/alerts?province=${encodeURIComponent(f?.data.region.province ?? "")}`).catch(
    fail("alerts"),
  );
  return {
    forecast: f && { status: f.status, fetchedAt: f.fetchedAt, ...f.data },
    earthquakes: q && { status: q.status, fetchedAt: q.fetchedAt, ...q.data },
    alerts: a && { status: a.status, fetchedAt: a.fetchedAt, items: a.data },
    errors,
    loading: false,
  };
}

function read(): Persisted {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    return defaults;
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(defaults);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState<LiveData>(emptyLiveData);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      return;
    }
  }, [state, ready]);

  useEffect(() => {
    if (!ready || state.mode !== "LIVE") return;
    let active = true;
    const run = () => loadLive(state.adm4).then((data) => active && setLive(data));
    run();
    const timer = window.setInterval(run, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, state.mode, state.adm4]);

  const setMode = useCallback((mode: Mode) => setState((s) => ({ ...s, mode })), []);
  const setScenario = useCallback(
    (scenarioCode: string) => setState((s) => ({ ...s, scenarioCode, mode: "SIMULATION" })),
    [],
  );
  const setAdm4 = useCallback((adm4: string | null) => setState((s) => ({ ...s, adm4 })), []);
  const login = useCallback((user: DemoUser) => setState((s) => ({ ...s, user })), []);
  const logout = useCallback(() => setState((s) => ({ ...s, user: null })), []);
  const addReport = useCallback(
    (report: Report) => setState((s) => ({ ...s, addedReports: [report, ...s.addedReports] })),
    [],
  );
  const reviewReport = useCallback(
    (id: string, status: ReportStatus, reviewNote: string) =>
      setState((s) => ({ ...s, overrides: { ...s.overrides, [id]: { status, reviewNote } } })),
    [],
  );
  const resetDemo = useCallback(
    () => setState((s) => ({ ...s, addedReports: [], overrides: {}, mode: "LIVE" })),
    [],
  );

  const snapshot = useMemo<Snapshot>(() => {
    const base =
      state.mode === "LIVE" ? mergeLive(getLiveSnapshot(), live) : getScenarioSnapshot(state.scenarioCode);
    const modeKey = state.mode === "LIVE" ? "live" : "simulation";
    const added = state.addedReports.filter((r) => r.dataMode === modeKey);
    const reports = [...added, ...base.reports].map((r) => {
      const o = state.overrides[r.id];
      return o ? { ...r, status: o.status, reviewNote: o.reviewNote } : r;
    });
    return { ...base, reports };
  }, [state, live]);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      ready,
      snapshot,
      setMode,
      setScenario,
      setAdm4,
      login,
      logout,
      addReport,
      reviewReport,
      resetDemo,
    }),
    [state, ready, snapshot, setMode, setScenario, setAdm4, login, logout, addReport, reviewReport, resetDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState harus dipakai di dalam AppStateProvider");
  return v;
}
