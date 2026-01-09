import { Link } from "wouter";

interface ClickableNameProps {
  personId?: string | null;
  name: string;
  className?: string;
}

export function ClickableName({ personId, name, className = "" }: ClickableNameProps) {
  if (!personId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link 
      href={`/people/${personId}`}
      className={`text-primary hover:underline cursor-pointer ${className}`}
      data-testid={`link-person-${personId}`}
    >
      {name}
    </Link>
  );
}
