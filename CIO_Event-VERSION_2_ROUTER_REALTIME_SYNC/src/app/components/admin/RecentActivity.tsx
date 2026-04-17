import { useState, useEffect } from "react";
import { MessageSquare, UserCheck, Play } from "lucide-react";
import { db } from "../../utils/database";
import { supabase, REALTIME_CHANNEL } from "../../utils/supabaseClient";

type ActivityType = {
  id: string;
  type: "checkin" | "question_sent";
  message: string;
  timestamp: Date;
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityType[]>([]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const attendees = await db.getAttendees();
        const questions = await db.getQuestions();

        const checkIns: ActivityType[] = attendees
          .filter((a) => a.checked_in_at)
          .map((a) => ({
            id: `checkin-${a.id}`,
            type: "checkin",
            message: `${a.name} checked in`,
            timestamp: new Date(a.checked_in_at!),
          }));

        const sentQuestions: ActivityType[] = questions
          .filter((q) => q.sent_at)
          .map((q) => ({
            id: `question-${q.id}`,
            type: "question_sent",
            message: "Question sent to attendees",
            timestamp: new Date(q.sent_at!),
          }));

        const allActivities = [...checkIns, ...sentQuestions]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 6);

        setActivities(allActivities);
      } catch (err) {
        console.error("Failed to load activities:", err);
      }
    };

    loadInitialData();

    const channel = supabase.channel(REALTIME_CHANNEL);

    channel.on("broadcast", { event: "question-push" }, (payload) => {
      const question = payload.payload;
      const newActivity: ActivityType = {
        id: `question-${question.id}-${Date.now()}`,
        type: "question_sent",
        message: "Question sent to attendees",
        timestamp: new Date(),
      };
      setActivities((prev) => [newActivity, ...prev].slice(0, 10));
    });

    channel.subscribe();

    const checkInInterval = setInterval(async () => {
      const attendees = await db.getAttendees();
      const latestCheckIns = attendees
        .filter((a) => a.checked_in_at)
        .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
        .slice(0, 3);

      if (latestCheckIns.length > 0) {
        const latestCheckIn = latestCheckIns[0];
        const existingIds = activities.map((a) => a.id);
        if (!existingIds.includes(`checkin-${latestCheckIn.id}`)) {
          const newActivity: ActivityType = {
            id: `checkin-${latestCheckIn.id}`,
            type: "checkin",
            message: `${latestCheckIn.name} checked in`,
            timestamp: new Date(latestCheckIn.checked_in_at!),
          };
          setActivities((prev) => {
            const filtered = prev.filter(
              (a) => !(a.type === "checkin" && a.message === newActivity.message)
            );
            return [newActivity, ...filtered].slice(0, 6);
          });
        }
      }
    }, 5000);

    return () => {
      clearInterval(checkInInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "checkin":
        return { icon: UserCheck, color: "bg-[#10b981]" };
      case "question_sent":
        return { icon: MessageSquare, color: "bg-primary" };
      default:
        return { icon: Play, color: "bg-muted-foreground" };
    }
  };

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No recent activity</p>
      ) : (
        activities.map((activity) => {
          const { icon: Icon, color } = getActivityIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`w-2 h-2 ${color} rounded-full mt-2`} />
              <div className="flex-1">
                <p style={{ fontSize: "0.9375rem", fontWeight: 500 }}>{activity.message}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
                  {timeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
