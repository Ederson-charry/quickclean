import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropProps {
  onFile: (name: string) => void;
  accept?: string;
  label?: string;
  optional?: boolean;
  selectedFile?: string;
}

export function FileDrop({
  onFile,
  accept = "image/*,.pdf",
  label = "Subir archivo",
  optional = false,
  selectedFile,
}: FileDropProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    onFile(file.name);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    onFile("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand-300 bg-brand-50 p-3">
          <FileText className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-700">
            {selectedFile}
          </span>
          <button
            type="button"
            onClick={clear}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-faint hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label="Quitar archivo seleccionado"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${label}${optional ? " (opcional)" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
            dragging
              ? "border-brand-500 bg-brand-50"
              : "border-line bg-surface hover:border-brand-300 hover:bg-brand-50/50",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <Upload className="h-5 w-5 text-brand-600" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">
              {dragging ? "Suelta el archivo aquí" : label}
            </p>
            <p className="mt-0.5 text-xs text-faint">
              {optional ? "Opcional · " : ""}Foto o PDF · Máx 10 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={onChange}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
