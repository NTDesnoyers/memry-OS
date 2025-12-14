import * as React from "react"
import { cn } from "@/lib/utils"

interface RatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: number
  onChange: (value: number) => void
  max?: number
  label?: string
  labels?: { min: string; max: string }
}

export function Rating({
  value,
  onChange,
  max = 10,
  className,
  label,
  labels,
  ...props
}: RatingProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <div className="flex items-center gap-1 w-full">
        {labels?.min && <span className="text-xs text-muted-foreground w-16 text-right mr-2 uppercase tracking-wider">{labels.min}</span>}
        <div className="flex flex-1 justify-between gap-1">
          {Array.from({ length: max }).map((_, i) => {
            const ratingValue = i + 1
            const isActive = ratingValue <= value
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(ratingValue)}
                className={cn(
                  "h-8 w-8 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {ratingValue}
              </button>
            )
          })}
        </div>
        {labels?.max && <span className="text-xs text-muted-foreground w-16 ml-2 uppercase tracking-wider">{labels.max}</span>}
      </div>
    </div>
  )
}
