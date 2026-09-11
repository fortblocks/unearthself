import type { ReactNode } from "react";
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Route as QuestLayout } from "@/routes/quest";
import { Route as QuestIndex } from "@/routes/quest.index";
import { Route as QuestToday } from "@/routes/quest.today";
import { Route as QuestPlay } from "@/routes/quest.play";
import { Route as QuestBoundary } from "@/routes/quest.boundary";
import { Route as QuestSpecimen } from "@/routes/quest.specimen";
import { Route as QuestRecover } from "@/routes/quest.recover";
import { Route as QuestRecorder } from "@/routes/quest.recorder";
import { Route as QuestMirror } from "@/routes/quest.mirror";
import { Route as QuestExperiment } from "@/routes/quest.experiment";
import { Route as QuestRunes } from "@/routes/quest.runes";
import { Route as QuestShuttle } from "@/routes/quest.shuttle";
import { Route as QuestThirty } from "@/routes/quest.thirty";
import { Route as QuestMap } from "@/routes/quest.map";
import { Route as QuestAdmin } from "@/routes/quest.admin";
import { Route as QuestAdminIndex } from "@/routes/quest.admin.index";
import { Route as QuestAdminLive } from "@/routes/quest.admin.live";
import { Route as QuestAdminRoster } from "@/routes/quest.admin.roster";
import { Route as QuestAdminPack } from "@/routes/quest.admin.pack";
import { Route as QuestAdminBroadcast } from "@/routes/quest.admin.broadcast";
import { Route as QuestAdminSafety } from "@/routes/quest.admin.safety";
import { Route as QuestAdminPaper } from "@/routes/quest.admin.paper";
import { Route as QuestAdminAfter } from "@/routes/quest.admin.after";

type CompMod = { options: { component?: () => unknown } };

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/quest" });
  },
});

const questRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quest",
  component: QuestLayout.options.component,
});

function child(parent: typeof questRoute, path: string, mod: CompMod) {
  return createRoute({
    getParentRoute: () => parent,
    path,
    component: mod.options.component as () => ReactNode,
  });
}

const adminRoute = createRoute({
  getParentRoute: () => questRoute,
  path: "admin",
  component: QuestAdmin.options.component,
});

function adminChild(path: string, mod: CompMod) {
  return createRoute({
    getParentRoute: () => adminRoute,
    path,
    component: mod.options.component as () => ReactNode,
  });
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  questRoute.addChildren([
    child(questRoute, "/", QuestIndex),
    child(questRoute, "today", QuestToday),
    child(questRoute, "play", QuestPlay),
    child(questRoute, "boundary", QuestBoundary),
    child(questRoute, "specimen", QuestSpecimen),
    child(questRoute, "recover", QuestRecover),
    child(questRoute, "recorder", QuestRecorder),
    child(questRoute, "mirror", QuestMirror),
    child(questRoute, "experiment", QuestExperiment),
    child(questRoute, "runes", QuestRunes),
    child(questRoute, "shuttle", QuestShuttle),
    child(questRoute, "map", QuestMap),
    child(questRoute, "thirty", QuestThirty),
    adminRoute.addChildren([
      adminChild("/", QuestAdminIndex),
      adminChild("live", QuestAdminLive),
      adminChild("roster", QuestAdminRoster),
      adminChild("pack", QuestAdminPack),
      adminChild("broadcast", QuestAdminBroadcast),
      adminChild("safety", QuestAdminSafety),
      adminChild("paper", QuestAdminPaper),
      adminChild("after", QuestAdminAfter),
    ]),
  ]),
]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function QuestNativeApp() {
  return <RouterProvider router={router} />;
}
