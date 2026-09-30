// src/pages/sweets-training/SweetsTrainingHub.jsx
// The confectionery company's Internal Training, inside the company app
// (card "training"). Same feature set as the other company's /training
// system — home, create session, sessions & quizzes & certificates, annual
// plan & yearly summary, gap analysis, settings — but its own copied pages,
// its own sweets_training_* report types and its own modules (./content).
//
// The page is kept in the URL (?card=training&tp=sessions) so a refresh or
// the browser Back button stays where the user was.
import React, { Suspense, lazy, useMemo } from "react";
import { useNavigate as useRouterNavigate, useSearchParams } from "react-router-dom";
import { TrainingNavContext } from "./nav";

const PAGES = {
  home: lazy(() => import("./TrainingHome")),
  create: lazy(() => import("./TrainingSessionCreate")),
  sessions: lazy(() => import("./TrainingSessionsList")),
  "annual-plan": lazy(() => import("./TrainingAnnualPlan")),
  "gap-analysis": lazy(() => import("./TrainingGapAnalysis")),
  admin: lazy(() => import("./TrainingAdmin")),
};

const Loading = () => (
  <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontWeight: 800 }}>⏳ Loading…</div>
);

export default function SweetsTrainingHub() {
  const [params, setParams] = useSearchParams();
  const routerNavigate = useRouterNavigate();
  const tp = params.get("tp") || "home";
  const page = PAGES[tp] ? tp : "home";
  const Page = PAGES[page];

  const nav = useMemo(
    () => ({
      go: (p) => {
        const next = new URLSearchParams(params);
        if (!p || p === "home") next.delete("tp");
        else next.set("tp", p);
        setParams(next);
        window.scrollTo({ top: 0 });
      },
      back: () => routerNavigate(-1),
      exit: () => routerNavigate("/company-app"),
    }),
    [params, setParams, routerNavigate]
  );

  return (
    <TrainingNavContext.Provider value={nav}>
      <Suspense fallback={<Loading />}>
        <Page key={page} />
      </Suspense>
    </TrainingNavContext.Provider>
  );
}
