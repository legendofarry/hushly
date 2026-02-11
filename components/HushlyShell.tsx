import React from "react";
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
  return (
    <div className="relative min-h-screen font-sans selection:bg-rose-500/30 selection:text-white  privacy-lock">
      <BackgroundHearts />
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
