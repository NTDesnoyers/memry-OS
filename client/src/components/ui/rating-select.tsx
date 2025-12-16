import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface RatingSelectProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function RatingSelect({ value, onChange, className }: RatingSelectProps) {
  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger className={cn("w-20 h-9", className)}>
        <SelectValue placeholder="--" />
      </SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <SelectItem key={n} value={n.toString()}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
