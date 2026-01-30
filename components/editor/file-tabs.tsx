import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface FileTab {
  id: string
  name: string
  language?: string
}

interface FileTabsProps {
  files: FileTab[]
  activeFileId: string | null
  onSelect: (fileId: string) => void
  onClose?: (fileId: string) => void
  className?: string
}

export function FileTabs({
  files,
  activeFileId,
  onSelect,
  onClose,
  className,
}: FileTabsProps) {
  return (
    <div
      className={cn(
        "flex w-full overflow-x-auto border-b bg-muted/50 text-sm",
        className
      )}
    >
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onSelect(file.id)}
          className={cn(
            "group flex min-w-[100px] max-w-[200px] cursor-pointer items-center justify-between border-r px-3 py-2 transition-colors hover:bg-background/50",
            activeFileId === file.id
              ? "bg-background font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          <span className="truncate mr-2">{file.name}</span>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(file.id)
              }}
              className="opacity-0 group-hover:opacity-100 rounded-sm p-0.5 hover:bg-muted-foreground/20 transition-opacity"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close {file.name}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
