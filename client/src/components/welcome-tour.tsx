import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Users, MessageSquare, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_STEPS = [
  {
    title: "Welcome to Memry Beta",
    description: "You're one of our first testers! Your feedback shapes this product. Use the feedback button (bottom right) to report bugs or share ideas.",
    icon: Sparkles,
  },
  {
    title: "Track Your Relationships",
    description: "Add contacts, log interactions, and keep FORD notes (Family, Occupation, Recreation, Dreams) to build deeper relationships.",
    icon: Users,
    action: { label: "Add Your First Contact", href: "/people/new" },
  },
  {
    title: "AI Assistant",
    description: "Press Cmd+K to open the Command Palette. Type > to ask questions, or / for quick skills like comparing listings or drafting messages.",
    icon: MessageSquare,
  },
  {
    title: "Revive Dormant Leads",
    description: "The Revival Engine scans your Gmail for contacts you haven't reached out to recently and helps you re-engage them.",
    icon: Zap,
    action: { label: "Check Revival Opportunities", href: "/revival" },
  },
  {
    title: "Weekly Planning",
    description: "Complete your Weekly Meeting Agenda to stay on track with your relationship habits and touchpoints.",
    icon: Target,
    action: { label: "Start Weekly Report", href: "/weekly-report" },
  },
];

export function WelcomeTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("memry-tour-completed");
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("memry-tour-completed", "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            data-testid="button-skip-tour"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
          <p className="opacity-90">{step.description}</p>
        </div>

        <div className="p-6">
          {step.action && (
            <a href={step.action.href} onClick={handleComplete}>
              <Button className="w-full mb-4 bg-amber-500 hover:bg-amber-600" data-testid="button-tour-action">
                {step.action.label}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep ? "bg-amber-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev} data-testid="button-tour-prev">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                variant={currentStep === TOUR_STEPS.length - 1 ? "default" : "outline"}
                size="sm"
                onClick={handleNext}
                data-testid="button-tour-next"
              >
                {currentStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
                {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
