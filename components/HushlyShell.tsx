import React from "react";
import { useLocation } from "react-router-dom";
import BackgroundHearts from "../hushly/components/BackgroundHearts";
import HushlyNavbar from "./HushlyNavbar";

interface Props {
  children: React.ReactNode;
  showNav: boolean;
  unreadNotifications?: number;
}

const HushlyShell: React.FC<Props> = ({
  children,
  showNav,
  unreadNotifications = 0,
}) => {
  const location = useLocation();
  const hideHearts = location.pathname.startsWith("/discover");

  return (
    <div className="relative min-h-screen font-sans selection:bg-rose-500/30 selection:text-white  privacy-lock">
      {!hideHearts && <BackgroundHearts />}
      <div
        className={`relative z-10 min-h-screen transition-all ${
          showNav ? "pb-24" : ""
        }`}
      >
        {children}
      </div>
      {showNav && <HushlyNavbar unreadNotifications={unreadNotifications} />}
    </div>
  );
};

export default HushlyShell;
