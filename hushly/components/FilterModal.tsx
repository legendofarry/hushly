import React, { useMemo, useState } from "react";
import { Filters } from "../types";
import { GENDER_PREFERENCE_OPTIONS, IntentType } from "../../types";
import {
  KENYA_LOCATIONS,
  PERSONALITY_OPTIONS,
  LIFESTYLE_OPTIONS,
  FAMILY_PLANS_OPTIONS,
} from "../constants";
import { KENYA_SCHOOLS } from "../../data/kenyaSchools";

interface Props {
  filters: Filters;
  defaultFilters: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

const BottomSheet = ({
  title,
  options,
  current,
  onSelect,
  onClose,
}: {
  title: string;
  options: string[];
  current: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in duration-300"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onTouchStart={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      className="w-full bg-[#121212] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-8"></div>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <button
          onClick={onClose}
          className="bg-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest"
        >
          Done
        </button>
      </div>
      <div className="flex flex-wrap gap-2 pb-10 max-h-[40vh] overflow-y-auto no-scrollbar">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(opt);
            }}
            className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
              current === opt
                ? "bg-white text-black border-white"
                : "bg-transparent border-white/10 text-slate-500"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const MultiSelectSheet = ({
  title,
  options,
  selected,
  onToggle,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onClose,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in duration-300"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onTouchStart={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      className="w-full bg-[#121212] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-8"></div>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              onClick={onClear}
              className="bg-slate-900 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-widest"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest"
          >
            Done
          </button>
        </div>
      </div>
      {onSearchChange && (
        <div className="mb-4">
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? "Search"}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500/60"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2 pb-10 max-h-[40vh] overflow-y-auto no-scrollbar">
        {options.length === 0 ? (
          <p className="text-xs text-slate-500">
            No options found. Try another search.
          </p>
        ) : (
          options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(opt);
                }}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  active
                    ? "bg-white text-black border-white"
                    : "bg-transparent border-white/10 text-slate-500"
                }`}
              >
                {opt}
              </button>
            );
          })
        )}
      </div>
    </div>
  </div>
);

const FilterModal: React.FC<Props> = ({
  filters,
  defaultFilters,
  onApply,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<Filters>({ ...filters });
  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(
    null,
  );
  const [showDoubleDateModal, setShowDoubleDateModal] = useState(false);
  const [doubleDateError, setDoubleDateError] = useState<string | null>(null);
  const [schoolQuery, setSchoolQuery] = useState("");
  const showMeLabel =
    GENDER_PREFERENCE_OPTIONS.find(
      (option) => option.value === localFilters.gender,
    )?.label ?? "Select";
  const intentOptions = Object.values(IntentType);
  const MIN_AGE = 18;
  const MAX_AGE = 60;
  const [minAge, maxAge] = localFilters.ageRange;
  const locationLabel = (() => {
    if (!localFilters.location.length) return "Any location";
    if (localFilters.location.length === 1)
      return `${localFilters.location[0]}, Kenya`;
    if (localFilters.location.length === 2)
      return `${localFilters.location[0]}, ${localFilters.location[1]}`;
    return `${localFilters.location[0]}, ${localFilters.location[1]} +${
      localFilters.location.length - 2
    }`;
  })();
  const formatMultiValue = (values: string[], fallback = "Any") => {
    if (!values.length) return fallback;
    if (values.length === 1) return values[0];
    return `${values[0]} +${values.length - 1}`;
  };
  const schoolLabel = formatMultiValue(localFilters.school, "Any school");

  const filteredSchoolOptions = useMemo(() => {
    const query = schoolQuery.trim().toLowerCase();
    if (!query) return [...KENYA_SCHOOLS];
    return KENYA_SCHOOLS.filter((school) =>
      school.toLowerCase().includes(query),
    );
  }, [schoolQuery]);

  const toggleSelection = (current: string[], value: string) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

  const toggleFamilyPlans = (current: string[], value: string) => {
    const desireOptions = new Set([
      "Want children",
      "Don't want children",
      "Open to children",
      "Not sure yet",
    ]);
    if (value === "Have children") {
      return toggleSelection(current, value);
    }
    const hasValue = current.includes(value);
    const withoutDesires = current.filter((item) => !desireOptions.has(item));
    if (hasValue) {
      return withoutDesires;
    }
    return [...withoutDesires, value];
  };

  const handleToggle = (key: keyof Filters) => {
    setLocalFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SelectionRow = ({
    label,
    icon,
    value,
    onClick,
  }: {
    label: string;
    icon?: string;
    value?: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-5 group active:opacity-60 transition-all border-b border-white/5 last:border-0"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <i
            className={`fa-solid ${icon} text-slate-500 text-sm w-5 text-center`}
          ></i>
        )}
        <span className="text-[13px] font-medium text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {value || "Select"}
        </span>
        <i className="fa-solid fa-chevron-right text-[10px] text-slate-700"></i>
      </div>
    </button>
  );

  const ToggleRow = ({
    label,
    icon,
    value,
    onToggle,
  }: {
    label: string;
    icon?: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <div className="w-full flex items-center justify-between py-5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        {icon && (
          <i
            className={`fa-solid ${icon} text-slate-500 text-sm w-5 text-center`}
          ></i>
        )}
        <span className="text-[13px] font-medium text-white">{label}</span>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${value ? "bg-rose-500" : "bg-slate-800"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${value ? "right-1" : "left-1"}`}
        ></div>
      </button>
    </div>
  );

  const handleSave = () => {
    if (localFilters.mode === "Double Date") {
      setDoubleDateError(
        "Double Date is coming soon. Please select For You for now.",
      );
      setShowDoubleDateModal(true);
      return;
    }
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({ ...defaultFilters });
    setDoubleDateError(null);
    setShowDoubleDateModal(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-['Outfit'] animate-in fade-in duration-300 overflow-hidden">
      <header className="px-6 py-6 flex items-center justify-between z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white text-lg"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-sm font-black text-white uppercase tracking-widest">
          Preferences
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="text-slate-400 font-black text-[10px] uppercase tracking-widest"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="text-rose-500 font-black text-xs uppercase tracking-widest"
          >
            Save
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-6 pb-24">
        {/* MODES */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">
            Modes
          </p>
          <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() =>
                setLocalFilters({ ...localFilters, mode: "For You" })
              }
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${localFilters.mode === "For You" ? "bg-slate-800 text-white shadow-xl" : "text-slate-500"}`}
            >
              For You
            </button>
            <button
              onClick={() => {
                setLocalFilters({ ...localFilters, mode: "Double Date" });
                setDoubleDateError(null);
                setShowDoubleDateModal(true);
              }}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${localFilters.mode === "Double Date" ? "bg-slate-800 text-white shadow-xl" : "text-slate-500"}`}
            >
              Double Date
            </button>
          </div>
        </div>

        {/* LOCATION SECTION */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5 space-y-6">
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
              Location
            </p>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-location-dot text-rose-500"></i>
              <span className="text-[13px] font-bold text-white">
                {locationLabel}
              </span>
            </div>
            <button
              onClick={() => setActiveBottomSheet("location")}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest"
            >
              Choose locations
            </button>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Select one or more locations, or keep Any location to see everyone.
            </p>
          </div>
        </div>

        {/* SCHOOL SECTION */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5 space-y-4">
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
              School
            </p>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-school text-rose-500"></i>
              <span className="text-[13px] font-bold text-white">
                {schoolLabel}
              </span>
            </div>
            <button
              onClick={() => {
                setSchoolQuery("");
                setActiveBottomSheet("school");
              }}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest"
            >
              Choose schools
            </button>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Filter discovery to students from the same institution.
            </p>
          </div>
        </div>

        {/* BASIC DISCOVERY */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5">
          <SelectionRow
            label="Show Me"
            value={showMeLabel}
            onClick={() => setActiveBottomSheet("gender")}
          />
        </div>

        {/* AGE RANGE */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              Age Range
            </span>
            <span className="text-[13px] font-bold text-white">
              {localFilters.ageRange[0]} - {localFilters.ageRange[1]}
            </span>
          </div>
          <div className="relative w-full mb-6">
            <div className="h-1.5 w-full rounded-lg bg-slate-800"></div>
            <div
              className="absolute top-0 h-1.5 rounded-lg bg-rose-500/70"
              style={{
                left: `${((minAge - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%`,
                right: `${100 - ((maxAge - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%`,
              }}
            ></div>
            <input
              type="range"
              min={MIN_AGE}
              max={MAX_AGE}
              value={minAge}
              onChange={(e) => {
                const nextMin = Math.min(
                  parseInt(e.target.value),
                  maxAge - 1,
                );
                setLocalFilters({
                  ...localFilters,
                  ageRange: [nextMin, maxAge],
                });
              }}
              className="absolute top-0 left-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-rose-500 z-20 dual-range"
            />
            <input
              type="range"
              min={MIN_AGE}
              max={MAX_AGE}
              value={maxAge}
              onChange={(e) => {
                const nextMax = Math.max(
                  parseInt(e.target.value),
                  minAge + 1,
                );
                setLocalFilters({
                  ...localFilters,
                  ageRange: [minAge, nextMax],
                });
              }}
              className="absolute top-0 left-0 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-rose-500 z-30 dual-range"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-300 leading-tight pr-4">
              Show people slightly out of my preferred range if I run out of
              profiles to see
            </span>
            <button
              onClick={() => handleToggle("expandAge")}
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${localFilters.expandAge ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-slate-800"}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${localFilters.expandAge ? "right-1" : "left-1"}`}
              ></div>
            </button>
          </div>
        </div>

        {/* DETAILED PREFERENCES */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5">
          <SelectionRow
            label="Looking for"
            icon="fa-eye"
            value={localFilters.lookingFor || "Any"}
            onClick={() => setActiveBottomSheet("lookingFor")}
          />
          <SelectionRow
            label="Family Plans"
            icon="fa-baby"
            value={formatMultiValue(localFilters.familyPlans)}
            onClick={() => setActiveBottomSheet("familyPlans")}
          />
          <SelectionRow
            label="Communication Style"
            icon="fa-comment"
            value={formatMultiValue(localFilters.communicationStyle)}
            onClick={() => setActiveBottomSheet("communication")}
          />
          <SelectionRow
            label="Love Style"
            icon="fa-heart"
            value={formatMultiValue(localFilters.loveStyle)}
            onClick={() => setActiveBottomSheet("loveStyle")}
          />
          <SelectionRow
            label="Pets"
            icon="fa-paw"
            value={formatMultiValue(localFilters.pets)}
            onClick={() => setActiveBottomSheet("pets")}
          />
          <SelectionRow
            label="Drinking"
            icon="fa-glass-water"
            value={formatMultiValue(localFilters.drinking)}
            onClick={() => setActiveBottomSheet("drinking")}
          />
          <SelectionRow
            label="Smoking"
            icon="fa-smoking"
            value={formatMultiValue(localFilters.smoking)}
            onClick={() => setActiveBottomSheet("smoking")}
          />
          <SelectionRow
            label="Workout"
            icon="fa-dumbbell"
            value={formatMultiValue(localFilters.workout)}
            onClick={() => setActiveBottomSheet("workout")}
          />
        </div>
      </main>

      {/* BOTTOM SHEETS */}
      {activeBottomSheet === "gender" && (
        <BottomSheet
          title="Show Me"
          options={GENDER_PREFERENCE_OPTIONS.map((option) => option.label)}
          current={showMeLabel}
          onSelect={(label) => {
            const match = GENDER_PREFERENCE_OPTIONS.find(
              (option) => option.label === label,
            );
            setLocalFilters({
              ...localFilters,
              gender: match?.value ?? "everyone",
            });
          }}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "school" && (
        <MultiSelectSheet
          title="School"
          options={filteredSchoolOptions}
          selected={localFilters.school}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              school: toggleSelection(prev.school, value),
            }))
          }
          onClear={() =>
            setLocalFilters((prev) => ({ ...prev, school: [] }))
          }
          searchValue={schoolQuery}
          onSearchChange={setSchoolQuery}
          searchPlaceholder="Search schools"
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "location" && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in duration-300"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActiveBottomSheet(null);
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) setActiveBottomSheet(null);
          }}
        >
          <div
            className="w-full bg-[#121212] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-8"></div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white">Location</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBottomSheet(null);
                }}
                className="bg-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest"
              >
                Done
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pb-10 max-h-[45vh] overflow-y-auto no-scrollbar">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalFilters({ ...localFilters, location: [] });
                }}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  localFilters.location.length === 0
                    ? "bg-white text-black border-white"
                    : "bg-transparent border-white/10 text-slate-500"
                }`}
              >
                Any location
              </button>
              {KENYA_LOCATIONS.map((loc) => {
                const selected = localFilters.location.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalFilters((prev) => {
                        const next = new Set(prev.location);
                        if (next.has(loc)) {
                          next.delete(loc);
                        } else {
                          next.add(loc);
                        }
                        return { ...prev, location: Array.from(next) };
                      });
                    }}
                    className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                      selected
                        ? "bg-white text-black border-white"
                        : "bg-transparent border-white/10 text-slate-500"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {activeBottomSheet === "lookingFor" && (
        <BottomSheet
          title="Looking for"
          options={intentOptions}
          current={localFilters.lookingFor}
          onSelect={(v) => setLocalFilters({ ...localFilters, lookingFor: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "drinking" && (
        <MultiSelectSheet
          title="Drinking"
          options={LIFESTYLE_OPTIONS.drink}
          selected={localFilters.drinking}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              drinking: toggleSelection(prev.drinking, value),
            }))
          }
          onClear={() =>
            setLocalFilters((prev) => ({ ...prev, drinking: [] }))
          }
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "familyPlans" && (
        <MultiSelectSheet
          title="Family Plans"
          options={FAMILY_PLANS_OPTIONS}
          selected={localFilters.familyPlans}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              familyPlans: toggleFamilyPlans(prev.familyPlans, value),
            }))
          }
          onClear={() =>
            setLocalFilters((prev) => ({ ...prev, familyPlans: [] }))
          }
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "communication" && (
        <MultiSelectSheet
          title="Communication Style"
          options={PERSONALITY_OPTIONS.communication}
          selected={localFilters.communicationStyle}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              communicationStyle: toggleSelection(
                prev.communicationStyle,
                value,
              ),
            }))
          }
          onClear={() =>
            setLocalFilters((prev) => ({ ...prev, communicationStyle: [] }))
          }
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "loveStyle" && (
        <MultiSelectSheet
          title="Love Style"
          options={PERSONALITY_OPTIONS.loveLanguage}
          selected={localFilters.loveStyle}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              loveStyle: toggleSelection(prev.loveStyle, value),
            }))
          }
          onClear={() => setLocalFilters((prev) => ({ ...prev, loveStyle: [] }))}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "pets" && (
        <MultiSelectSheet
          title="Pets"
          options={LIFESTYLE_OPTIONS.pets}
          selected={localFilters.pets}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              pets: toggleSelection(prev.pets, value),
            }))
          }
          onClear={() => setLocalFilters((prev) => ({ ...prev, pets: [] }))}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "smoking" && (
        <MultiSelectSheet
          title="Smoking"
          options={LIFESTYLE_OPTIONS.smoke}
          selected={localFilters.smoking}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              smoking: toggleSelection(prev.smoking, value),
            }))
          }
          onClear={() => setLocalFilters((prev) => ({ ...prev, smoking: [] }))}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "workout" && (
        <MultiSelectSheet
          title="Workout"
          options={LIFESTYLE_OPTIONS.workout}
          selected={localFilters.workout}
          onToggle={(value) =>
            setLocalFilters((prev) => ({
              ...prev,
              workout: toggleSelection(prev.workout, value),
            }))
          }
          onClear={() => setLocalFilters((prev) => ({ ...prev, workout: [] }))}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}

      {showDoubleDateModal && (
        <div className="fixed inset-0 z-[130] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
              <i className="fa-solid fa-user-group text-rose-500 text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
              Double Date
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Double Date lets you pair up with a friend and match with another
              duo. You will get coordinated matches and shared plans that work
              for both people.
            </p>
            <p className="text-xs text-rose-400 font-black uppercase tracking-widest mb-6">
              Coming soon
            </p>
            {doubleDateError && (
              <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2 mb-5">
                {doubleDateError}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setLocalFilters({ ...localFilters, mode: "For You" });
                  setShowDoubleDateModal(false);
                }}
                className="w-full bg-rose-500 text-white font-black py-3 rounded-2xl uppercase tracking-widest text-xs"
              >
                Stay on For You
              </button>
              <button
                onClick={() => setShowDoubleDateModal(false)}
                className="w-full bg-slate-800 text-slate-300 font-black py-3 rounded-2xl uppercase tracking-widest text-xs border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterModal;
