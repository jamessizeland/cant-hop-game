import { Routes, Route } from "react-router-dom";
import { SplashPage, GamePage, StatsPage, SettingsPage } from "pages";
import { checkEnv } from "utils";
import { MdDataExploration, MdGames, MdSettings } from "react-icons/md";

type RouteType = {
  title: string;
  path: string;
  element: React.ReactNode;
  icon?: React.ReactNode;
};

const publicRoutes: RouteType[] = [
  {
    title: "Stats",
    path: "/stats",
    element: <StatsPage />,
    icon: <MdDataExploration />,
  },
];

const allRoutes: RouteType[] = [
  ...publicRoutes,
  {
    title: "Settings",
    path: "/settings",
    element: <SettingsPage />,
    icon: <MdSettings />,
  },
  {
    title: "Splash",
    path: "/",
    element: <SplashPage />,
  },
  {
    title: "Game",
    path: "/game",
    element: <GamePage />,
    icon: <MdGames />,
  },
];

const devRoutes: RouteType[] = [];

export const routes: RouteType[] = checkEnv("development")
  ? allRoutes.concat(...devRoutes)
  : allRoutes;

export default function AppRoutes(): React.ReactNode {
  return (
    <Routes>
      {routes.map(({ path, element, title }) => (
        <Route key={title} path={path} element={element} />
      ))}
    </Routes>
  );
}
