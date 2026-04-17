import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Calendar, Clock, User, Bell, MessageSquare, Users } from "lucide-react";
import { LiveQuestionPush } from "./LiveQuestionPush";
import { type PushedQuestion } from "../utils/questionEvents";
import { supabase, MEETINGS_CHANNEL, SPEAKER_CHANNEL } from "../utils/supabaseClient";
import { db } from "../utils/database";

interface DashboardScreenProps {
  name: string;
  onQuestionClick: () => void;
  onNotificationClick: () => void;
  pushedQuestion?: PushedQuestion | null;
  showLiveQuestion?: boolean;
  onDismiss?: () => void;
  onAnswer?: () => void;
}

export function DashboardScreen({ name, onQuestionClick, onNotificationClick, pushedQuestion, showLiveQuestion: externalShowLive, onDismiss: externalOnDismiss, onAnswer: externalOnAnswer }: DashboardScreenProps) {
  const firstName = (name || "Guest").split(" ")[0];
  const [internalShowLiveQuestion, setInternalShowLiveQuestion] = useState(false);
  const [internalPushedQuestion, setInternalPushedQuestion] = useState<PushedQuestion | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<(string | number)[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<PushedQuestion[]>([]);
  
  const showLiveQuestion = externalShowLive !== undefined ? externalShowLive : internalShowLiveQuestion;
  const setShowLiveQuestion = externalShowLive !== undefined ? () => {} : setInternalShowLiveQuestion;
  const currentPushedQuestion = pushedQuestion !== undefined ? pushedQuestion : internalPushedQuestion;
  const setCurrentPushedQuestion = pushedQuestion !== undefined ? () => {} : setInternalPushedQuestion;
  const handleDismiss = externalOnDismiss ?? (() => setInternalShowLiveQuestion(false));
  const handleAnswerNow = externalOnAnswer ?? (() => {
    setInternalShowLiveQuestion(false);
    onQuestionClick();
  });

  const handleAnswerQuestion = (questionId: string | number) => {
    setAnsweredQuestions(prev => [...prev, questionId]);
    setUnansweredQuestions(prev => prev.filter(q => q.id !== questionId));
    onQuestionClick();
  };

  const [agenda, setAgenda] = useState<Array<{time: string; title: string; type: string; status: string; speaker?: string}>>([]);
  const [featuredSpeaker, setFeaturedSpeaker] = useState<{name: string; company: string; bio: string} | null>(null);

  useEffect(() => {
    loadAgenda();
    loadFeaturedSpeaker();

    const meetingsChannel = supabase.channel(MEETINGS_CHANNEL);
    meetingsChannel
      .on('broadcast', { event: 'meetings-update' }, () => {
        loadAgenda();
      })
      .subscribe();

    const speakerChannel = supabase.channel(SPEAKER_CHANNEL);
    speakerChannel
      .on('broadcast', { event: 'speaker-update' }, (payload) => {
        if (payload.payload) {
          setFeaturedSpeaker(payload.payload);
        } else {
          loadFeaturedSpeaker();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(speakerChannel);
    };
  }, []);

  const loadFeaturedSpeaker = async () => {
    try {
      const settings = await db.getEventSettings();
      setFeaturedSpeaker({
        name: settings.featured_speaker_name,
        company: settings.featured_speaker_company,
        bio: settings.featured_speaker_bio,
      });
    } catch (err) {
      console.error("Failed to load from DB, trying localStorage:", err);
      // Fallback to localStorage
      const stored = localStorage.getItem("cio_featured_speaker");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFeaturedSpeaker({
            name: parsed.name || "Dr. Sarah Mitchell",
            company: parsed.company || "CIO, GlobalTech Industries",
            bio: parsed.bio || "Transforming Enterprise Technology",
          });
        } catch {
          setFeaturedSpeaker({
            name: "Dr. Sarah Mitchell",
            company: "CIO, GlobalTech Industries",
            bio: "Transforming Enterprise Technology: Lessons from a Billion-Dollar Journey",
          });
        }
      }
    }
  };

  const getMeetingStatus = (startTime: string, endTime: string | null): "completed" | "current" | "upcoming" => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startDate = new Date(today);
    startDate.setHours(startHour, startMin, 0, 0);
    
    let endDate = null;
    if (endTime) {
      const [endHour, endMin] = endTime.split(":").map(Number);
      endDate = new Date(today);
      endDate.setHours(endHour, endMin, 0, 0);
    }
    
    if (now < startDate) {
      return "upcoming";
    } else if (endDate && now > endDate) {
      return "completed";
    } else {
      return "current";
    }
  };

  const loadAgenda = async () => {
    try {
      const meetings = await db.getMeetings();
      const mapped = meetings.map((m) => ({
        time: m.start_time,
        title: m.title,
        type: "session",
        status: getMeetingStatus(m.start_time, m.end_time),
        speaker: m.location || "",
      }));
      setAgenda(mapped.length > 0 ? mapped : [
        { time: "08:00", title: "Registration & Breakfast", type: "meal", status: "completed" },
        { time: "09:00", title: "Opening Keynote", type: "session", status: "current", speaker: "Main Hall" },
        { time: "10:30", title: "AI Strategy Panel", type: "session", status: "upcoming", speaker: "Conference Room A" },
        { time: "12:00", title: "Networking Lunch", type: "meal", status: "upcoming", speaker: "Dining Hall" },
      ]);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setAgenda([
        { time: "08:00", title: "Registration & Breakfast", type: "meal", status: "completed" },
        { time: "09:00", title: "Opening Keynote", type: "session", status: "current", speaker: "Main Hall" },
        { time: "10:30", title: "AI Strategy Panel", type: "session", status: "upcoming", speaker: "Conference Room A" },
        { time: "12:00", title: "Networking Lunch", type: "meal", status: "upcoming", speaker: "Dining Hall" },
      ]);
    }
  };

  return (
    <>
      <LiveQuestionPush
        isVisible={showLiveQuestion}
        question={currentPushedQuestion}
        onAnswer={handleAnswerNow}
        onDismiss={handleDismiss}
      />
      <div className="min-h-screen bg-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                  Checked In
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onNotificationClick}
            className="relative p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>
      </motion.div>

      <div className="px-6 py-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="mb-2" style={{ fontSize: "1.875rem", fontWeight: 600 }}>
            Good morning, {firstName}
          </h1>
          <p className="text-muted-foreground mb-8" style={{ fontSize: "1rem" }}>
            Here's what's happening today
          </p>
        </motion.div>

        {unansweredQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/40 rounded-2xl p-6 relative overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent blur-2xl"
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <MessageSquare className="w-6 h-6 text-primary" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {unansweredQuestions.length}
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                    Unanswered Questions
                  </h2>
                </div>

                <p className="text-foreground/80 mb-5" style={{ fontSize: "0.9375rem" }}>
                  Please share your input on the following questions
                </p>

                <div className="space-y-3">
                  {unansweredQuestions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      onClick={() => handleAnswerQuestion(question.id)}
                      className="p-4 bg-[#0a0c14]/60 backdrop-blur-sm border border-primary/30 rounded-xl cursor-pointer hover:bg-[#0a0c14]/80 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="mb-2" style={{ fontSize: "1rem", fontWeight: 500 }}>
                            {question.text}
                          </p>
                          {question.type === "multiple-choice" && question.options && (
                            <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
                              {question.options.length} options
                            </p>
                          )}
                          {question.type === "text" && (
                            <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
                              Text response required
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 px-4 py-2 bg-primary/20 group-hover:bg-primary text-primary group-hover:text-primary-foreground rounded-lg transition-all" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                          Answer
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground mb-1" style={{ fontSize: "0.875rem" }}>
                  Featured Speaker
                </p>
                <p style={{ fontSize: "1.25rem", fontWeight: 600 }} className="mb-1">
                  {featuredSpeaker?.name || "Dr. Sarah Mitchell"}
                </p>
                <p className="text-muted-foreground mb-3" style={{ fontSize: "0.9375rem" }}>
                  {featuredSpeaker?.company || "CIO, GlobalTech Industries"}
                </p>
                <p className="text-foreground/80" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  "{featuredSpeaker?.bio || "Transforming Enterprise Technology: Lessons from a Billion-Dollar Journey"}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            <Calendar className="w-5 h-5 text-primary" />
            Today's Agenda
          </h2>

          <div className="space-y-3">
            {agenda.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className={`relative pl-8 pb-3 ${
                  index !== agenda.length - 1 ? "border-l-2" : ""
                } ${
                  item.status === "completed"
                    ? "border-primary/30"
                    : item.status === "current"
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                <div
                  className={`absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                    item.status === "completed"
                      ? "bg-primary border-primary"
                      : item.status === "current"
                      ? "bg-primary border-primary animate-pulse"
                      : "bg-[#0a0c14] border-border"
                  }`}
                />

                <div
                  className={`rounded-xl p-4 transition-all ${
                    item.status === "current"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-secondary/30 border border-transparent hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span
                        className={item.status === "current" ? "text-primary" : "text-muted-foreground"}
                        style={{ fontSize: "0.875rem", fontWeight: 500 }}
                      >
                        {item.time}
                      </span>
                    </div>
                    {item.status === "current" && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-md" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                        Now
                      </span>
                    )}
                  </div>
                  <p
                    style={{ fontSize: "1rem", fontWeight: 500 }}
                    className={item.status === "completed" ? "text-muted-foreground" : ""}
                  >
                    {item.title}
                  </p>
                  {item.speaker && (
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "0.875rem" }}>
                      {item.speaker}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {unansweredQuestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              <MessageSquare className="w-5 h-5 text-primary" />
              Engage
            </h2>

            <div className="grid gap-3">
              <button
                onClick={onQuestionClick}
                className="w-full p-5 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/30 rounded-2xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: "1rem", fontWeight: 500 }} className="mb-1">
                      Live Q&A
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                      Participate in real-time discussions
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </button>

              <div className="p-5 bg-secondary/30 border border-border rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: "1rem", fontWeight: 500 }} className="mb-1 text-muted-foreground">
                      Networking Lounge
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                      Available during lunch
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}
