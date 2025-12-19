import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  isToday,
  startOfDay,
  setHours,
  setMinutes,
} from "date-fns";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckSquare, Video, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Task, Meeting } from "@shared/schema";

type ViewMode = "month" | "week" | "day";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "task" | "meeting";
  completed?: boolean;
  priority?: string;
  personId?: string | null;
  duration?: number;
}

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((event) => isSameDay(event.date, date));
}

function EventItem({
  event,
  onDragStart,
  compact = false,
}: {
  event: CalendarEvent;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  compact?: boolean;
}) {
  const isTask = event.type === "task";
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      className={cn(
        "group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-grab active:cursor-grabbing transition-colors",
        isTask
          ? event.completed
            ? "bg-muted text-muted-foreground line-through"
            : event.priority === "high"
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        "hover:ring-2 hover:ring-ring hover:ring-offset-1"
      )}
      data-testid={`event-${event.type}-${event.id}`}
    >
      <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
      {isTask ? (
        <CheckSquare className="h-3 w-3 flex-shrink-0" />
      ) : (
        <Video className="h-3 w-3 flex-shrink-0" />
      )}
      <span className={cn("truncate", compact ? "max-w-[60px]" : "max-w-[120px]")}>
        {event.title}
      </span>
    </div>
  );
}

function DayCell({
  date,
  events,
  currentMonth,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  date: Date;
  events: CalendarEvent[];
  currentMonth: Date;
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const dayEvents = getEventsForDate(events, date);
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, date)}
      className={cn(
        "min-h-[100px] border border-border p-1 transition-colors",
        !isCurrentMonth && "bg-muted/30",
        isCurrentDay && "bg-primary/5 ring-1 ring-primary/20"
      )}
      data-testid={`day-cell-${format(date, "yyyy-MM-dd")}`}
    >
      <div
        className={cn(
          "text-sm font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full",
          isCurrentDay && "bg-primary text-primary-foreground",
          !isCurrentMonth && "text-muted-foreground"
        )}
      >
        {format(date, "d")}
      </div>
      <div className="space-y-1 overflow-hidden">
        {dayEvents.slice(0, 3).map((event) => (
          <EventItem key={event.id} event={event} onDragStart={onDragStart} compact />
        ))}
        {dayEvents.length > 3 && (
          <div className="text-xs text-muted-foreground px-2">
            +{dayEvents.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            events={events}
            currentMonth={currentDate}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={onDragOver}
          />
        ))}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  events,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = getEventsForDate(events, day);
        const isCurrentDay = isToday(day);

        return (
          <div
            key={day.toISOString()}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, day)}
            className={cn(
              "min-h-[300px] border rounded-lg p-3 transition-colors",
              isCurrentDay && "ring-2 ring-primary/30 bg-primary/5"
            )}
            data-testid={`week-day-${format(day, "yyyy-MM-dd")}`}
          >
            <div className="text-center mb-3">
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold mt-1 h-8 w-8 mx-auto flex items-center justify-center rounded-full",
                  isCurrentDay && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <EventItem key={event.id} event={event} onDragStart={onDragStart} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  currentDate,
  events,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDragStart: (e: React.DragEvent, event: CalendarEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const dayEvents = getEventsForDate(events, currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="border rounded-lg">
      <div
        className={cn(
          "text-center p-4 border-b",
          isToday(currentDate) && "bg-primary/5"
        )}
      >
        <div className="text-sm text-muted-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div className="text-2xl font-bold">{format(currentDate, "MMMM d, yyyy")}</div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourDate = setHours(setMinutes(startOfDay(currentDate), 0), hour);
          const hourEvents = dayEvents.filter((event) => {
            const eventHour = event.date.getHours();
            return eventHour === hour;
          });

          return (
            <div
              key={hour}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, hourDate)}
              className="flex border-b hover:bg-muted/30 transition-colors min-h-[60px]"
              data-testid={`hour-${hour}`}
            >
              <div className="w-16 py-2 px-3 text-sm text-muted-foreground border-r flex-shrink-0">
                {format(hourDate, "h a")}
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourEvents.map((event) => (
                  <EventItem key={event.id} event={event} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, dueDate }: { id: string; dueDate: Date }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: dueDate.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task rescheduled" });
    },
    onError: () => {
      toast({ title: "Failed to reschedule", variant: "destructive" });
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, startTime }: { id: string; startTime: Date }) => {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: startTime.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to update meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting rescheduled" });
    },
    onError: () => {
      toast({ title: "Failed to reschedule", variant: "destructive" });
    },
  });

  const events: CalendarEvent[] = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: task.id,
        title: task.title,
        date: new Date(task.dueDate!),
        type: "task" as const,
        completed: task.completed,
        priority: task.priority || undefined,
        personId: task.personId,
      }));

    const meetingEvents: CalendarEvent[] = meetings
      .filter((meeting) => meeting.startTime)
      .map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        date: new Date(meeting.startTime!),
        type: "meeting" as const,
        duration: meeting.duration || undefined,
        personId: meeting.personId,
      }));

    return [...taskEvents, ...meetingEvents];
  }, [tasks, meetings]);

  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", event.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const newDate = targetDate;
    
    if (viewMode !== "day") {
      newDate.setHours(draggedEvent.date.getHours());
      newDate.setMinutes(draggedEvent.date.getMinutes());
    }

    if (draggedEvent.type === "task") {
      updateTaskMutation.mutate({ id: draggedEvent.id, dueDate: newDate });
    } else {
      updateMeetingMutation.mutate({ id: draggedEvent.id, startTime: newDate });
    }

    setDraggedEvent(null);
  };

  const getTitle = () => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  };

  const taskCount = events.filter((e) => e.type === "task").length;
  const meetingCount = events.filter((e) => e.type === "meeting").length;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2" data-testid="calendar-heading">
              <CalendarIcon className="h-6 w-6" />
              Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              View and reschedule your tasks and meetings
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <CheckSquare className="h-3 w-3" />
              {taskCount} tasks
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Video className="h-3 w-3" />
              {meetingCount} meetings
            </Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  data-testid="button-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  data-testid="button-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleToday} data-testid="button-today">
                  Today
                </Button>
                <CardTitle className="ml-2">{getTitle()}</CardTitle>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize"
                    data-testid={`button-view-${mode}`}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "month" && (
              <MonthView
                currentDate={currentDate}
                events={events}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              />
            )}
            {viewMode === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              />
            )}
            {viewMode === "day" && (
              <DayView
                currentDate={currentDate}
                events={events}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
