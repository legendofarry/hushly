import React, { useState, useEffect, useMemo } from "react";
import { User, Game, WeekendPlan, RSVP, Profile } from "../types";
import { GAMES, MOCK_PROFILES, KENYA_LOCATIONS } from "../constants";

interface Props {
  user: User | null;
  onExit: () => void;
  onViewProfile?: (profile: Profile) => void;
  onUpgrade?: () => void;
}

const GameHub: React.FC<Props> = ({
  user,
  onExit,
  onViewProfile,
  onUpgrade,
}) => {
  const [activeTab, setActiveTab] = useState<"arcade" | "weekend">("arcade");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [plans, setPlans] = useState<WeekendPlan[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isViewingRSVPs, setIsViewingRSVPs] = useState<WeekendPlan | null>(
    null,
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showGoldRequired, setShowGoldRequired] = useState(false);
  const [showRsvpConfirmation, setShowRsvpConfirmation] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [rsvpSort, setRsvpSort] = useState<"none" | "most">("none");

  // Form State for new plan
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planLoc, setPlanLoc] = useState("");
  const [planImage, setPlanImage] = useState<string | null>(null);

  useEffect(() => {
    // Mock initial plans
    const mockPlans: WeekendPlan[] = [
      {
        id: "wp1",
        creatorId: "p1", // Njeri
        creatorName: "Njeri",
        title: "Karura Forest Hike & Picnic",
        description:
          "Join us for a Saturday morning hike followed by a chilled picnic. Bring snacks!",
        date: "Next Saturday, 9:00 AM",
        location: "Nairobi",
        image:
          "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80",
        rsvps: [
          {
            userId: "u10",
            name: "Zuri",
            contact: "0712345678",
            timestamp: Date.now() - 3600000,
          },
        ],
      },
      {
        id: "wp2",
        creatorId: "p2", // Mwende
        creatorName: "Mwende",
        title: "Mombasa Beach Party",
        description:
          "Sunday Funday at Nyali Beach. Music, drinks, and good vibes.",
        date: "This Sunday, 4:00 PM",
        location: "Mombasa",
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        rsvps: [
          {
            userId: "u11",
            name: "Kev",
            contact: "0700000000",
            timestamp: Date.now(),
          },
          {
            userId: "u12",
            name: "Zahra",
            contact: "0711111111",
            timestamp: Date.now(),
          },
        ],
      },
    ];
    setPlans(mockPlans);
  }, []);

  const filteredPlans = useMemo(() => {
    let result = plans.filter((plan) => {
      const matchesSearch =
        plan.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        locationFilter === "All" || plan.location === locationFilter;
      return matchesSearch && matchesLocation;
    });

    if (rsvpSort === "most") {
      result = result.sort((a, b) => b.rsvps.length - a.rsvps.length);
    }

    return result;
  }, [plans, searchQuery, locationFilter, rsvpSort]);

  const handleCreatePlanClick = () => {
    if (!user?.isPaid) {
      setShowGoldRequired(true);
      return;
    }
    setIsCreatingPlan(true);
  };

  const generatePlanIdea = () => {
    setIsAiLoading(true);
    const templates = [
      {
        title: "Sunset Rooftop Chill",
        description: "Golden hour vibes, mocktails, and easy conversation.",
        location: "Nairobi",
      },
      {
        title: "Beach Walk + Street Eats",
        description: "A chilled stroll, then sampling coastal snacks together.",
        location: "Mombasa",
      },
      {
        title: "Karura Forest Picnic",
        description: "Soft hike, music, and a simple picnic under the trees.",
        location: "Nairobi",
      },
      {
        title: "Lakeside Hangout",
        description: "Relax by the water, take photos, and share good stories.",
        location: "Kisumu",
      },
    ];
    const pick = templates[Math.floor(Math.random() * templates.length)];
    setPlanTitle(pick.title);
    setPlanDesc(pick.description);
    setPlanLoc(pick.location);
    setPlanDate("Next Saturday, 2:00 PM");
    window.setTimeout(() => setIsAiLoading(false), 200);
  };

  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re: any) => {
          setPlanImage(re.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const submitPlan = () => {
    if (!planTitle || !planDesc || !planDate || !planLoc || !planImage || !user)
      return;

    const newPlan: WeekendPlan = {
      id: Math.random().toString(36).substr(2, 9),
      creatorId: user.id,
      creatorName: user.name,
      title: planTitle,
      description: planDesc,
      date: planDate,
      location: planLoc,
      image: planImage,
      rsvps: [],
    };

    setPlans([newPlan, ...plans]);
    setIsCreatingPlan(false);
    // Reset form
    setPlanTitle("");
    setPlanDesc("");
    setPlanDate("");
    setPlanLoc("");
    setPlanImage(null);
  };

  const handleRSVP = (planId: string) => {
    if (!user) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const isAlreadyRsvpd = plan.rsvps.some((r) => r.userId === user.id);

    if (isAlreadyRsvpd) {
      // Logic for Un-RSVP
      if (window.confirm("Do you want to cancel your RSVP?")) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? { ...p, rsvps: p.rsvps.filter((r) => r.userId !== user.id) }
              : p,
          ),
        );
      }
      return;
    }

    const contact = prompt(
      "Please provide your contact (Phone or WhatsApp) for the creator:",
      user.email || "",
    );
    if (!contact) return;

    const newRsvp: RSVP = {
      userId: user.id,
      name: user.name,
      contact: contact,
      timestamp: Date.now(),
    };

    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, rsvps: [...p.rsvps, newRsvp] } : p,
      ),
    );

    // Show thumbs up confirmation
    setShowRsvpConfirmation(true);
    setTimeout(() => {
      setShowRsvpConfirmation(false);
    }, 2500);
  };

  const navigateToProfile = (creatorId: string) => {
    if (onViewProfile) {
      const profile = MOCK_PROFILES.find((p) => p.id === creatorId);
      if (profile) {
        onViewProfile(profile);
      } else if (creatorId === user?.id) {
        alert("This is your post!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950 overflow-hidden font-['Outfit']">
      <div className="relative px-6 pt-6 pb-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border-t border-white/30">
              <i className="fa-solid fa-ghost text-white text-2xl animate-bounce"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                HUSHLY<span className="text-indigo-400">HUB</span>
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-slate-900 border border-indigo-500/30 px-3 py-1 rounded-xl flex items-center gap-2">
              <i className="fa-solid fa-coins text-amber-400 text-xs"></i>
              <span className="text-xs font-black text-white">450</span>
            </div>
            <button
              onClick={onExit}
              className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-500 active:scale-90 transition-all hover:bg-rose-500 hover:text-white"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab("arcade")}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === "arcade" ? "bg-indigo-500 border-indigo-400 text-white shadow-lg" : "bg-slate-900 border-white/5 text-slate-500"}`}
          >
            Arcade Room
          </button>
          <button
            onClick={() => setActiveTab("weekend")}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === "weekend" ? "bg-rose-500 border-rose-400 text-white shadow-lg" : "bg-slate-900 border-white/5 text-slate-500"}`}
          >
            Weekend
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {activeTab === "arcade" ? (
          <>
            <section className="px-6 mb-12">
              <div className="bg-indigo-600/10 backdrop-blur-xl border border-indigo-500/20 rounded-[3rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[2rem] border-4 border-indigo-500 p-1 bg-slate-950 shadow-2xl">
                      <img
                        src={user?.photos[0]}
                        className="w-full h-full rounded-[1.5rem] object-cover"
                        alt=""
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 px-2 py-0.5 rounded-lg border-2 border-slate-950 text-[8px] font-black text-white uppercase tracking-tighter">
                      Online
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {user?.name}
                    </h3>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">
                      Mall Resident
                    </p>
                    <button className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/5 transition-all">
                      Global Chat
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <div className="flex-1 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">
                      Rank
                    </p>
                    <p className="text-white font-black">Diamond III</p>
                  </div>
                  <div className="flex-1 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-slate-500 text-[9px] font-black uppercase mb-1">
                      Win Rate
                    </p>
                    <p className="text-white font-black">68%</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <div className="px-6 flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-gamepad text-indigo-500"></i> THE
                  ARCADE
                </h3>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Swipe to Browse
                </span>
              </div>

              <div className="flex gap-6 overflow-x-auto no-scrollbar px-6">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="min-w-[280px] bg-slate-900 border border-white/5 rounded-[3rem] p-6 text-left relative group overflow-hidden active:scale-95 transition-all"
                  >
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 ${game.color} opacity-10 blur-3xl group-hover:opacity-30 transition-opacity`}
                    ></div>

                    <div
                      className={`w-16 h-16 ${game.color} rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl mb-6 relative z-10`}
                    >
                      <i className={`fa-solid ${game.icon}`}></i>
                    </div>

                    <h4 className="text-2xl font-black text-white mb-2 relative z-10">
                      {game.name}
                    </h4>
                    <p className="text-slate-500 text-xs mb-8 relative z-10 leading-relaxed font-medium">
                      {game.description}
                    </p>

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex -space-x-3">
                        {[1, 2, 3].map((i) => (
                          <img
                            key={i}
                            src={`https://picsum.photos/50/50?random=${i + 10}`}
                            className="w-8 h-8 rounded-full border-2 border-slate-900"
                            alt=""
                          />
                        ))}
                        <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-500">
                          +12
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        Play Now
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="px-6">
              <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-8">
                <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter italic">
                  Live Challenges
                </h3>
                <div className="space-y-4">
                  {[
                    { user: "Njeri", game: "Tic Tac Toe", status: "Waiting" },
                    {
                      user: "Otieno",
                      game: "Kenyan Trivia",
                      status: "In Game",
                    },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xs">
                          {c.user[0]}
                        </div>
                        <div>
                          <p className="text-white font-black text-sm">
                            {c.user}
                          </p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase">
                            {c.game}
                          </p>
                        </div>
                      </div>
                      <button
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${c.status === "Waiting" ? "bg-indigo-500 text-white" : "text-slate-600 border border-slate-800"}`}
                      >
                        {c.status === "Waiting" ? "Join" : "Watch"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="px-6 space-y-8 animate-in fade-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                  WEEKEND <span className="text-rose-500">PLANS</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Connect beyond the screen
                </p>
              </div>
            </div>

            {/* CREATE PLAN CALL-TO-ACTION CARD */}
            <div className="bg-gradient-to-br from-rose-500/10 to-indigo-500/10 border border-rose-500/20 p-8 rounded-[3rem] relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full"></div>
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-rose-500/20 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-calendar-plus text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">
                  Share Your Weekend Vibe
                </h3>
                <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed px-4">
                  Create a plan, set a location, and find your tribe for the
                  weekend.
                </p>

                <button
                  onClick={handleCreatePlanClick}
                  className="bg-rose-500 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center gap-3"
                >
                  <i className="fa-solid fa-plus"></i>
                  Create Your Plan
                </button>

                {!user?.isPaid && (
                  <div className="mt-4 flex items-center gap-2">
                    <i className="fa-solid fa-crown text-amber-500 text-[10px]"></i>
                    <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest">
                      Gold Exclusive Feature
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or plan title..."
                  className="w-full bg-slate-900 border border-white/5 py-4 pl-12 pr-4 rounded-2xl text-white text-xs outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="flex-1 bg-slate-900 border border-white/5 p-3 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none"
                >
                  <option value="All">All Regions</option>
                  {KENYA_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() =>
                    setRsvpSort((prev) => (prev === "none" ? "most" : "none"))
                  }
                  className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${rsvpSort === "most" ? "bg-rose-500/10 border-rose-500 text-rose-500" : "bg-slate-900 border-white/5 text-slate-500"}`}
                >
                  <i className="fa-solid fa-fire"></i> Most Popular
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {filteredPlans.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                  <i className="fa-solid fa-search-minus text-5xl mb-4"></i>
                  <p className="font-black uppercase text-xs tracking-[0.2em]">
                    No Plans Found
                  </p>
                  <p className="text-[10px]">
                    Try adjusting your filters, rafiki.
                  </p>
                </div>
              ) : (
                filteredPlans.map((plan) => {
                  const isUserRsvpd = plan.rsvps.some(
                    (r) => r.userId === user?.id,
                  );
                  return (
                    <div
                      key={plan.id}
                      className="bg-slate-900/80 border border-white/5 rounded-[2.5rem] overflow-hidden group shadow-2xl relative"
                    >
                      <div className="aspect-[16/9] relative">
                        <img
                          src={plan.image}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-[9px] text-white font-black uppercase tracking-widest">
                            {plan.rsvps.length} RSVP'd
                          </span>
                        </div>
                        {plan.creatorId === user?.id && (
                          <button
                            onClick={() => setIsViewingRSVPs(plan)}
                            className="absolute top-4 right-4 bg-rose-500 px-3 py-1 rounded-xl text-[9px] font-black text-white uppercase tracking-widest"
                          >
                            Manage
                          </button>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                            {plan.date}
                          </span>
                          <span className="text-slate-700 text-[10px]">•</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {plan.location}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-white mb-2">
                          {plan.title}
                        </h4>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed line-clamp-2">
                          {plan.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => navigateToProfile(plan.creatorId)}
                            className="flex items-center gap-3 active:scale-95 transition-transform text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white font-black text-[10px]">
                              {plan.creatorName[0]}
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                              Posted by{" "}
                              <span className="text-white hover:text-rose-500 transition-colors underline decoration-rose-500/30 underline-offset-4">
                                {plan.creatorName}
                              </span>
                            </p>
                          </button>
                          <button
                            onClick={() => handleRSVP(plan.id)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${isUserRsvpd ? "bg-slate-800 text-slate-400 border border-white/5" : "bg-white text-slate-950 shadow-xl"}`}
                          >
                            {isUserRsvpd ? "Joined (Cancel?)" : "I'm In"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      {/* RSVP CONFIRMATION MODAL */}
      {showRsvpConfirmation && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] flex flex-col items-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <i className="fa-solid fa-thumbs-up text-white text-5xl"></i>
            </div>
            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">
              You're in!
            </h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
              See you there, rafiki!
            </p>
          </div>
        </div>
      )}

      {selectedGame && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl flex flex-col p-8 animate-in slide-in-from-bottom duration-500 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-50"></div>

          <div className="relative flex justify-between items-center mb-16 z-10">
            <button
              onClick={() => setSelectedGame(null)}
              className="text-slate-400 font-black uppercase tracking-widest text-xs flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i> Exit Game
            </button>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                Arena Ready
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
            <div
              className={`w-32 h-32 ${selectedGame.color} rounded-[2.5rem] flex items-center justify-center text-white text-5xl mb-10 shadow-[0_0_50px_rgba(99,102,241,0.4)] animate-float`}
            >
              <i className={`fa-solid ${selectedGame.icon}`}></i>
            </div>
            <h3 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase italic">
              {selectedGame.name}
            </h3>
            <p className="text-slate-400 mb-12 max-w-xs font-medium leading-relaxed">
              Connect and bond! Send a match an invite to this{" "}
              <span className="text-white">1-on-1 Safari challenge.</span>
            </p>

            <div className="w-full space-y-4 mb-12 max-w-md">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4">
                Choose Your Opponent
              </p>
              {[1, 2, 3].map((i) => (
                <button
                  key={i}
                  className="w-full bg-slate-900 p-5 rounded-[2rem] border border-white/5 flex items-center gap-4 transition-all hover:border-indigo-500/50 active:scale-95 text-left group"
                >
                  <div className="relative">
                    <img
                      src={`https://picsum.photos/100/100?random=${i + 40}`}
                      className="w-12 h-12 rounded-2xl grayscale group-hover:grayscale-0 transition-all"
                      alt=""
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-lg">Match #{i}</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      Nairobi, Kenya
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCreatingPlan && (
        <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col p-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => setIsCreatingPlan(false)}
              className="text-slate-500 font-black uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <h3 className="text-white font-black uppercase tracking-widest italic">
              Create <span className="text-rose-500">Plan</span>
            </h3>
            <button
              onClick={submitPlan}
              disabled={!planTitle || !planImage}
              className="text-rose-500 font-black uppercase tracking-widest text-xs disabled:opacity-20"
            >
              Post
            </button>
          </div>

          <div className="space-y-6 flex-1">
            <button
              onClick={generatePlanIdea}
              disabled={isAiLoading}
              className="w-full bg-gradient-to-r from-indigo-500 to-rose-500 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl shadow-rose-500/20"
            >
              {isAiLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              )}
              Use Quick Template
            </button>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                What's the plan?
              </label>
              <input
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl text-white outline-none focus:border-rose-500 transition-all"
                placeholder="e.g. Afternoon Sundowner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                  When?
                </label>
                <input
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl text-white outline-none"
                  placeholder="Saturday 4PM"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                  Where?
                </label>
                <select
                  value={planLoc}
                  onChange={(e) => setPlanLoc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl text-white outline-none"
                >
                  <option value="">Select Region</option>
                  {KENYA_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                Description
              </label>
              <textarea
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-white/5 p-4 rounded-2xl text-white outline-none resize-none"
                placeholder="Tell them more about the vibes..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                Cover Photo
              </label>
              <button
                onClick={handlePhotoUpload}
                className={`w-full aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative ${planImage ? "border-transparent" : "border-white/5 bg-slate-900 hover:border-rose-500/30"}`}
              >
                {planImage ? (
                  <img
                    src={planImage}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <>
                    <i className="fa-solid fa-image text-slate-700 text-3xl mb-2"></i>
                    <p className="text-[10px] text-slate-500 font-black uppercase">
                      Upload Cover
                    </p>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewingRSVPs && (
        <div className="fixed inset-0 z-[130] bg-slate-950/98 backdrop-blur-xl flex flex-col p-8 animate-in slide-in-from-bottom duration-500 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setIsViewingRSVPs(null)}
              className="text-slate-500 font-black uppercase tracking-widest text-xs"
            >
              Back
            </button>
            <h3 className="text-white font-black uppercase tracking-widest italic">
              <span className="text-rose-500">RSVPs</span>
            </h3>
            <div className="w-10"></div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 mb-8">
            <h4 className="text-xl font-black text-white mb-2">
              {isViewingRSVPs.title}
            </h4>
            <p className="text-rose-500 text-xs font-black uppercase tracking-widest">
              {isViewingRSVPs.rsvps.length} Total People Joined
            </p>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            {isViewingRSVPs.rsvps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                <i className="fa-solid fa-users-slash text-6xl mb-4"></i>
                <p className="font-bold">No RSVPs yet.</p>
                <p className="text-xs">Patience, the tribe is coming!</p>
              </div>
            ) : (
              isViewingRSVPs.rsvps.map((rsvp, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 p-5 rounded-3xl border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white font-black">
                      {rsvp.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">
                        {rsvp.name}
                      </p>
                      <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">
                        {rsvp.contact}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`tel:${rsvp.contact}`)}
                    className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 active:scale-90"
                  >
                    <i className="fa-solid fa-phone"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showGoldRequired && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-white/5 rounded-[3rem] p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50"></div>
            <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-crown text-amber-500 text-5xl animate-float"></i>
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase italic">
              GOLD <span className="text-amber-500">MEMBER</span> ONLY
            </h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium px-2">
              Creating Weekend plans is an exclusive feature for our Gold
              Members. Join the elite today!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowGoldRequired(false);
                  onUpgrade?.();
                }}
                className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowGoldRequired(false)}
                className="w-full text-slate-500 font-bold py-2 text-xs uppercase tracking-widest"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(GameHub);
