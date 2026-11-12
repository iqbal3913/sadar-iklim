"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DemoUser, MangroveAudit, Report, ReportStatus } from "./types";
import {
  emptyLiveData,
  getLiveSnapshot,
  getScenarioSnapshot,
  listMangroveAudits,
  mergeLive,
  type LiveData,
  type Snapshot,
} from "./data";

type Mode = "LIVE" | "SIMULATION";
type RouteDecision = "approved" | "rejected";

interface Persisted {
  mode: Mode;
  scenarioCode: string;
  adm4: string | null;
  user: DemoUser | null;
  addedReports: Report[];
  overrides: Record<string, { status: ReportStatus; reviewNote: string }>;
  addedAudits: MangroveAudit[];
  auditReviews: Record<string, MangroveAudit["verification"]>;
  routeDecisions: Record<string, RouteDecision>;
  removed: string[];
}

const defaults: Persisted = {
  mode: "LIVE",
  scenarioCode: "ROB-URBAN-01",
  adm4: null,
  user: null,
  addedReports: [],
  overrides: {},
  addedAudits: [],
  auditReviews: {},
  routeDecisions: {},
  removed: [],
};

const storageKey = "sadariklim-demo-state";

interface AppState extends Persisted {
  ready: boolean;
  snapshot: Snapshot;
  audits: MangroveAudit[];
  setMode: (mode: Mode) => void;
  setScenario: (code: string) => void;
  setAdm4: (adm4: string | null) => void;
  login: (user: DemoUser) => void;
  logout: () => void;
  addReport: (report: Report) => void;
  reviewReport: (id: string, status: ReportStatus, note: string) => void;
  removeItem: (id: string) => void;
  addAudit: (audit: MangroveAudit) => void;
  reviewAudit: (id: string, verification: MangroveAudit["verification"]) => void;
  decideRoute: (id: string, decision: RouteDecision | null) => void;
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
  const removeItem = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        addedReports: s.addedReports.filter((r) => r.id !== id),
        addedAudits: s.addedAudits.filter((a) => a.id !== id),
        removed: s.removed.includes(id) ? s.removed : [...s.removed, id],
      })),
    [],
  );
  const addAudit = useCallback(
    (audit: MangroveAudit) => setState((s) => ({ ...s, addedAudits: [audit, ...s.addedAudits] })),
    [],
  );
  const reviewAudit = useCallback(
    (id: string, verification: MangroveAudit["verification"]) =>
      setState((s) => ({ ...s, auditReviews: { ...s.auditReviews, [id]: verification } })),
    [],
  );
  const decideRoute = useCallback(
    (id: string, decision: RouteDecision | null) =>
      setState((s) => {
        const next = { ...s.routeDecisions };
        if (decision) next[id] = decision;
        else delete next[id];
        return { ...s, routeDecisions: next };
      }),
    [],
  );
  const resetDemo = useCallback(
    () =>
      setState((s) => ({
        ...s,
        addedReports: [],
        overrides: {},
        addedAudits: [],
        auditReviews: {},
        routeDecisions: {},
        removed: [],
        mode: "LIVE",
      })),
    [],
  );

  const snapshot = useMemo<Snapshot>(() => {
    const base =
      state.mode === "LIVE" ? mergeLive(getLiveSnapshot(), live) : getScenarioSnapshot(state.scenarioCode);
    const modeKey = state.mode === "LIVE" ? "live" : "simulation";
    const added = state.addedReports.filter((r) => r.dataMode === modeKey);
    const reports = [...added, ...base.reports]
      .filter((r) => !state.removed.includes(r.id))
      .map((r) => {
        const o = state.overrides[r.id];
        return o ? { ...r, status: o.status, reviewNote: o.reviewNote } : r;
      });
    return { ...base, reports };
  }, [state, live]);

  const audits = useMemo<MangroveAudit[]>(
    () =>
      [...state.addedAudits, ...listMangroveAudits()]
        .filter((a) => !state.removed.includes(a.id))
        .map((a) => ({ ...a, verification: state.auditReviews[a.id] ?? a.verification })),
    [state],
  );

  const value = useMemo<AppState>(
    () => ({
      ...state,
      ready,
      snapshot,
      audits,
      setMode,
      setScenario,
      setAdm4,
      login,
      logout,
      addReport,
      reviewReport,
      removeItem,
      addAudit,
      reviewAudit,
      decideRoute,
      resetDemo,
    }),
    [
      state,
      ready,
      snapshot,
      audits,
      setMode,
      setScenario,
      setAdm4,
      login,
      logout,
      addReport,
      reviewReport,
      removeItem,
      addAudit,
      reviewAudit,
      decideRoute,
      resetDemo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState harus dipakai di dalam AppStateProvider");
  return v;
}
