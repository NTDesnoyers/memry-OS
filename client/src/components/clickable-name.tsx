import { useState } from "react";
import { PersonProfileDrawer } from "./person-profile-drawer";

interface ClickableNameProps {
  personId?: string | null;
  name: string;
  className?: string;
}

export function ClickableName({ personId, name, className = "" }: ClickableNameProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  if (!personId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <>
      <button
        onClick={() => setProfileOpen(true)}
        className={`text-primary hover:underline cursor-pointer text-left ${className}`}
        data-testid={`link-person-${personId}`}
      >
        {name}
      </button>
      <PersonProfileDrawer
        personId={personId}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </>
  );
}
