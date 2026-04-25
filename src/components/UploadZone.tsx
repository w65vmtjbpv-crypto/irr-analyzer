"use client";

import { SUPPORTED_UPLOAD_ACCEPT } from "@/lib/uploadAssets";
import { useRef, useState } from "react";

interface UploadZoneProps {
  disabled?: boolean;
  selectedCount?: number;
  onSelectFiles: (files: File[]) => void | Promise<void>;
}

export function UploadZone({
  disabled = false,
  selectedCount = 0,
  onSelectFiles,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | File[] | null) {
    if (!files || disabled) {
      return;
    }

    const nextFiles = Array.from(files);

    if (nextFiles.length === 0) {
      return;
    }

    onSelectFiles(nextFiles);
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
        handleFiles(event.dataTransfer.files);
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
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[18px] border-[3px] border-[var(--border)] bg-[var(--accent-red)] px-3 py-4 font-mono text-lg font-bold text-white shadow-[4px_4px_0_#111111]">
          FILES
        </div>
        <div className="space-y-2">
          <h3 className="font-mono text-2xl font-bold tracking-[0.12em] text-[var(--foreground)] uppercase">
            DROP PDFS OR IMAGES.
          </h3>
          <p className="text-sm font-medium leading-7 text-[var(--muted-strong)]">
            支持 PDF、JPG、PNG、WEBP、GIF。多张图先选齐，再由你手动确认它们属于同一份材料。
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-full border-[3px] border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[4px_4px_0_#111111]">
            CLICK OR DROP. STAGE FIRST.
          </div>
          {selectedCount > 0 ? (
            <div className="inline-flex rounded-full border-[3px] border-[var(--border)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[4px_4px_0_#111111]">
              {selectedCount} FILES STAGED
            </div>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
