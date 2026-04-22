"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  disabled?: boolean;
  onUpload: (file: File) => void | Promise<void>;
}

export function UploadZone({ disabled = false, onUpload }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | null) {
    if (!file || disabled) {
      return;
    }

    onUpload(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files.item(0));
      }}
      className={`group brutal-card relative overflow-hidden px-8 py-12 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : isDragging
            ? "cursor-pointer -translate-x-[2px] -translate-y-[2px] bg-[rgba(217,255,67,0.32)] shadow-[10px_10px_0_#111111]"
            : "cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_#111111]"
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(217,255,67,0.2),transparent_40%)] opacity-80" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[18px] border-[3px] border-[var(--border)] bg-[var(--accent-red)] px-5 py-4 font-mono text-2xl font-bold text-white shadow-[4px_4px_0_#111111]">
          PDF
        </div>
        <div className="space-y-2">
          <h3 className="font-mono text-2xl font-bold tracking-[0.12em] text-[var(--foreground)] uppercase">
            DROP THE PDF.
          </h3>
          <p className="text-sm font-medium leading-7 text-[var(--muted-strong)]">
            把合同拖进来。我们拆掉销售话术，只留下保费、给付、现金价值和真实 IRR。
          </p>
        </div>
        <div className="inline-flex rounded-full border-[3px] border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[4px_4px_0_#111111]">
          CLICK OR DROP. NOW.
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.item(0) ?? null)}
      />
    </div>
  );
}
