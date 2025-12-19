import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Person } from "@shared/schema";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  id?: string;
  "data-testid"?: string;
}

interface MentionMatch {
  personId: string;
  personName: string;
  startIndex: number;
  endIndex: number;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  id,
  "data-testid": dataTestId,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/people"],
  });

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current || mentionStart === null) return;
    
    const textarea = textareaRef.current;
    const textBeforeCursor = value.substring(0, mentionStart);
    
    const mirror = document.createElement("div");
    mirror.style.cssText = window.getComputedStyle(textarea).cssText;
    mirror.style.height = "auto";
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.textContent = textBeforeCursor;
    
    const marker = document.createElement("span");
    marker.textContent = "@";
    mirror.appendChild(marker);
    
    document.body.appendChild(mirror);
    
    const textareaRect = textarea.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    
    document.body.removeChild(mirror);
    
    const relativeTop = markerRect.top - mirrorRect.top + 24;
    const relativeLeft = markerRect.left - mirrorRect.left;
    
    setDropdownPosition({
      top: Math.min(relativeTop, textarea.clientHeight),
      left: Math.min(relativeLeft, textarea.clientWidth - 200),
    });
  }, [value, mentionStart]);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
    }
  }, [showDropdown, updateDropdownPosition]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPeople.length, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      
      if ((charBeforeAt === " " || charBeforeAt === "\n" || atIndex === 0) && 
          !textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStart(atIndex);
        setSearchQuery(textAfterAt);
        setShowDropdown(true);
        return;
      }
    }
    
    setShowDropdown(false);
    setMentionStart(null);
    setSearchQuery("");
  };

  const insertMention = (person: Person) => {
    if (mentionStart === null || !textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(cursorPos);
    
    const mentionText = `@[${person.name}](${person.id})`;
    const newValue = beforeMention + mentionText + " " + afterMention;
    
    onChange(newValue);
    setShowDropdown(false);
    setMentionStart(null);
    setSearchQuery("");
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredPeople.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredPeople.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredPeople[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
      setMentionStart(null);
      setSearchQuery("");
    }
  };

  const getDisplayValue = (text: string) => {
    return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={getDisplayValue(value)}
        onChange={(e) => {
          const displayText = e.target.value;
          const originalText = value;
          
          const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
          const mentions: MentionMatch[] = [];
          let match;
          while ((match = mentionRegex.exec(originalText)) !== null) {
            mentions.push({
              personName: match[1],
              personId: match[2],
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            });
          }
          
          let reconstructed = displayText;
          mentions.forEach(m => {
            const displayMention = `@${m.personName}`;
            const fullMention = `@[${m.personName}](${m.personId})`;
            if (reconstructed.includes(displayMention)) {
              reconstructed = reconstructed.replace(displayMention, fullMention);
            }
          });
          
          handleInputChange({ target: { value: reconstructed, selectionStart: e.target.selectionStart } } as React.ChangeEvent<HTMLTextAreaElement>);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 200);
        }}
        placeholder={placeholder}
        rows={rows}
        data-testid={dataTestId}
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
      
      {showDropdown && filteredPeople.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[200px] max-h-[240px] overflow-y-auto"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          {filteredPeople.map((person, index) => (
            <button
              key={person.id}
              type="button"
              className={cn(
                "w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(person);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              data-testid={`mention-option-${person.id}`}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{person.name}</p>
                {person.role && (
                  <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {showDropdown && filteredPeople.length === 0 && searchQuery && (
        <div
          className="absolute z-50 bg-popover border rounded-md shadow-lg py-2 px-3 min-w-[200px]"
          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
          <p className="text-sm text-muted-foreground">No contacts found</p>
        </div>
      )}
    </div>
  );
}

export function parseMentions(text: string): { personId: string; personName: string }[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: { personId: string; personName: string }[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      personName: match[1],
      personId: match[2],
    });
  }
  return mentions;
}

export function getDisplayText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}
