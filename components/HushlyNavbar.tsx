import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

type HushlyTab = "dating" | "live" | "hub" | "messages" | "profile";

const getActiveTab = (pathname: string, search: string): HushlyTab => {
  const path = pathname.toLowerCase();
  if (path.startsWith("/chats")) return "messages";
  if (path.startsWith("/profile")) return "profile";
  if (path.startsWith("/settings")) return "profile";
  if (path.startsWith("/likes")) return "profile";
  if (path.startsWith("/admin")) return "profile";
  if (path.startsWith("/escort")) return "profile";
  if (path.startsWith("/discover")) {
    const params = new URLSearchParams(search);
    const view = params.get("view");
    if (view === "live") return "live";
    if (view === "hub") return "hub";
    return "dating";
  }
  return "dating";
};

const HushlyNavbar: React.FC<{ unreadNotifications?: number }> = ({
  unreadNotifications = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname, location.search);

  const tabs: { id: HushlyTab; icon: string; label: string; path: string }[] = [
    { id: "dating", icon: "fa-fire", label: "Swipe", path: "/discover" },
    {
      id: "live",
      icon: "fa-tower-broadcast",
      label: "Live",
      path: "/discover?view=live",
    },
    {
      id: "hub",
      icon: "fa-gamepad",
      label: "Hub",
      path: "/discover?view=hub",
    },
    { id: "messages", icon: "fa-message", label: "Chat", path: "/chats" },
    { id: "profile", icon: "fa-user-circle", label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[6rem] bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-50 pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.path)}
          className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${
            activeTab === tab.id
              ? "text-rose-500 scale-110"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className="relative">
            <i className={`fa-solid ${tab.icon} text-xl mb-1`}></i>
            {tab.id === "messages" && unreadNotifications > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-slate-950"></div>
            )}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {tab.label}
          </span>
          {activeTab === tab.id && (
            <div className="absolute -bottom-1 w-1 h-1 bg-rose-500 rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default HushlyNavbar;
