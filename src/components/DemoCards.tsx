"use client";

import { demoProfiles, type DemoProfile } from "@/data/demoProfiles";

interface DemoCardsProps {
  onSelect: (profile: DemoProfile) => void;
}

export function DemoCards({ onSelect }: DemoCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {demoProfiles.map((profile) => (
        <button
          key={profile.id}
          type="button"
          onClick={() => onSelect(profile)}
          className="brutal-card-soft group p-5 text-left hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111111]"
        >
          <div className="mb-4 inline-flex rounded-full border-[3px] border-[var(--border)] bg-[var(--accent)] px-3 py-1 font-mono text-xs font-bold tracking-[0.18em] text-[var(--foreground)] uppercase shadow-[4px_4px_0_#111111]">
            {profile.title}
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)]">{profile.contract.productName}</h3>
          <p className="mt-2 font-mono text-xs tracking-[0.14em] text-[var(--accent-red)] uppercase">{profile.kicker}</p>
          <p className="mt-4 text-sm font-medium leading-7 text-[var(--muted-strong)]">{profile.summary}</p>
        </button>
      ))}
    </div>
  );
}
