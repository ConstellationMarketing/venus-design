import ScrollToTop from "../components/ScrollToTop";
import TrailingSlashEnforcer from "../components/TrailingSlashEnforcer";
import GlobalScripts from "../components/layout/GlobalScripts";
import WcDniManager from "../components/layout/WcDniManager";
import AppRoutes from "./AppRoutes";

export default function AppRouterShell() {
  return (
    <>
      <ScrollToTop />
      <TrailingSlashEnforcer />
      <GlobalScripts />
      <WcDniManager />
      <AppRoutes />
    </>
  );
}
