import React, { useState } from "react";
import { Filters } from "../types";
import {
  KENYA_LOCATIONS,
  PERSONALITY_OPTIONS,
  LIFESTYLE_OPTIONS,
  LOOKING_FOR_OPTIONS,
  FAMILY_PLANS_OPTIONS,
} from "../constants";

interface Props {
  filters: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

const FilterModal: React.FC<Props> = ({ filters, onApply, onClose }) => {
  const [localFilters, setLocalFilters] = useState<Filters>({ ...filters });
  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(
    null,
  );

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
      onClick={onClose}
    >
      <div
        className="w-full bg-[#121212] rounded-t-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
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
              onClick={() => onSelect(opt)}
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
        <button
          onClick={() => onApply(localFilters)}
          className="text-rose-500 font-black text-xs uppercase tracking-widest"
        >
          Save
        </button>
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
              onClick={() =>
                setLocalFilters({ ...localFilters, mode: "Double Date" })
              }
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
                {localFilters.location}, Kenya
              </span>
            </div>
            <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
              Add a new location
            </button>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Change locations to find matches anywhere.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                Maximum Distance
              </span>
              <span className="text-[13px] font-bold text-white">
                {localFilters.distance}mi.
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={localFilters.distance}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  distance: parseInt(e.target.value),
                })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 mb-6"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300 leading-tight pr-4">
                Show people further away if I run out of profiles to see
              </span>
              <button
                onClick={() => handleToggle("expandDistance")}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${localFilters.expandDistance ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-slate-800"}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${localFilters.expandDistance ? "right-1" : "left-1"}`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* BASIC DISCOVERY */}
        <div className="bg-[#121212] rounded-3xl p-6 border border-white/5">
          <SelectionRow
            label="Show Me"
            value={localFilters.gender}
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
          <input
            type="range"
            min="18"
            max="60"
            value={localFilters.ageRange[1]}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                ageRange: [localFilters.ageRange[0], parseInt(e.target.value)],
              })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 mb-6"
          />
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
          <ToggleRow
            label="Has a bio"
            value={localFilters.hasBio}
            onToggle={() => handleToggle("hasBio")}
          />
          <SelectionRow
            label="Interests"
            onClick={() => setActiveBottomSheet("interests")}
          />
          <SelectionRow
            label="Looking for"
            icon="fa-eye"
            value={localFilters.lookingFor}
            onClick={() => setActiveBottomSheet("lookingFor")}
          />
          <SelectionRow
            label="Add languages"
            icon="fa-language"
            onClick={() => setActiveBottomSheet("languages")}
          />
          <SelectionRow
            label="Zodiac"
            icon="fa-moon"
            value={localFilters.zodiac}
            onClick={() => setActiveBottomSheet("zodiac")}
          />
          <SelectionRow
            label="Education"
            icon="fa-graduation-cap"
            value={localFilters.education}
            onClick={() => setActiveBottomSheet("education")}
          />
          <SelectionRow
            label="Family Plans"
            icon="fa-baby"
            value={localFilters.familyPlans}
            onClick={() => setActiveBottomSheet("familyPlans")}
          />
          <SelectionRow
            label="Communication Style"
            icon="fa-comment"
            value={localFilters.communicationStyle}
            onClick={() => setActiveBottomSheet("communication")}
          />
          <SelectionRow
            label="Love Style"
            icon="fa-heart"
            value={localFilters.loveStyle}
            onClick={() => setActiveBottomSheet("loveStyle")}
          />
          <SelectionRow
            label="Pets"
            icon="fa-paw"
            value={localFilters.pets}
            onClick={() => setActiveBottomSheet("pets")}
          />
          <SelectionRow
            label="Drinking"
            icon="fa-glass-water"
            value={localFilters.drinking}
            onClick={() => setActiveBottomSheet("drinking")}
          />
          <SelectionRow
            label="Smoking"
            icon="fa-smoking"
            value={localFilters.smoking}
            onClick={() => setActiveBottomSheet("smoking")}
          />
          <SelectionRow
            label="Workout"
            icon="fa-dumbbell"
            value={localFilters.workout}
            onClick={() => setActiveBottomSheet("workout")}
          />
          <SelectionRow
            label="Social Media"
            icon="fa-at"
            value={localFilters.socialMedia}
            onClick={() => setActiveBottomSheet("socialMedia")}
          />
        </div>
      </main>

      {/* BOTTOM SHEETS */}
      {activeBottomSheet === "gender" && (
        <BottomSheet
          title="Show Me"
          options={["Women", "Men", "Everyone"]}
          current={localFilters.gender}
          onSelect={(v) => setLocalFilters({ ...localFilters, gender: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "zodiac" && (
        <BottomSheet
          title="Zodiac"
          options={PERSONALITY_OPTIONS.zodiac}
          current={localFilters.zodiac}
          onSelect={(v) => setLocalFilters({ ...localFilters, zodiac: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "lookingFor" && (
        <BottomSheet
          title="Looking for"
          options={LOOKING_FOR_OPTIONS}
          current={localFilters.lookingFor}
          onSelect={(v) => setLocalFilters({ ...localFilters, lookingFor: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "drinking" && (
        <BottomSheet
          title="Drinking"
          options={LIFESTYLE_OPTIONS.drink}
          current={localFilters.drinking}
          onSelect={(v) => setLocalFilters({ ...localFilters, drinking: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "familyPlans" && (
        <BottomSheet
          title="Family Plans"
          options={FAMILY_PLANS_OPTIONS}
          current={localFilters.familyPlans}
          onSelect={(v) => setLocalFilters({ ...localFilters, familyPlans: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "communication" && (
        <BottomSheet
          title="Communication Style"
          options={PERSONALITY_OPTIONS.communication}
          current={localFilters.communicationStyle}
          onSelect={(v) =>
            setLocalFilters({ ...localFilters, communicationStyle: v })
          }
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "education" && (
        <BottomSheet
          title="Education"
          options={PERSONALITY_OPTIONS.education}
          current={localFilters.education}
          onSelect={(v) => setLocalFilters({ ...localFilters, education: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "loveStyle" && (
        <BottomSheet
          title="Love Style"
          options={PERSONALITY_OPTIONS.loveLanguage}
          current={localFilters.loveStyle}
          onSelect={(v) => setLocalFilters({ ...localFilters, loveStyle: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "pets" && (
        <BottomSheet
          title="Pets"
          options={LIFESTYLE_OPTIONS.pets}
          current={localFilters.pets}
          onSelect={(v) => setLocalFilters({ ...localFilters, pets: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "smoking" && (
        <BottomSheet
          title="Smoking"
          options={LIFESTYLE_OPTIONS.smoke}
          current={localFilters.smoking}
          onSelect={(v) => setLocalFilters({ ...localFilters, smoking: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
      {activeBottomSheet === "workout" && (
        <BottomSheet
          title="Workout"
          options={LIFESTYLE_OPTIONS.workout}
          current={localFilters.workout}
          onSelect={(v) => setLocalFilters({ ...localFilters, workout: v })}
          onClose={() => setActiveBottomSheet(null)}
        />
      )}
    </div>
  );
};

export default FilterModal;
