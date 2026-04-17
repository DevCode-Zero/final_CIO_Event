import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, User, CheckCircle2, Clock, Download, ArrowLeft, FileText } from "lucide-react";
import { db, type Attendee, type Question } from "../../utils/database";

interface AttendeeResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answerIndex: number | null;
  answerText: string | null;
  options: string[] | null;
  answeredAt: string;
}

export function IndividualReports() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [attendeeResponses, setAttendeeResponses] = useState<AttendeeResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const data = await db.getAttendees();
      setAttendees(data);
    } catch (err) {
      console.error("Failed to load attendees:", err);
    }
    setLoading(false);
  };

  const loadAttendeeResponses = async (attendeeId: string) => {
    setLoadingResponses(true);
    try {
      const responses = await db.getResponsesForAttendee(attendeeId);
      const questions = await db.getQuestions();
      
      const enrichedResponses: AttendeeResponse[] = responses.map((resp) => {
        const question = questions.find((q) => q.id === resp.question_id);
        return {
          questionId: resp.question_id,
          questionText: question?.text || "Unknown Question",
          questionType: question?.type || "unknown",
          answerIndex: resp.answer_index,
          answerText: resp.answer_text,
          options: question?.options || null,
          answeredAt: resp.created_at,
        };
      });

      setAttendeeResponses(enrichedResponses);
    } catch (err) {
      console.error("Failed to load responses:", err);
    }
    setLoadingResponses(false);
  };

  const handleSelectAttendee = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    loadAttendeeResponses(attendee.id);
  };

  const handleBack = () => {
    setSelectedAttendee(null);
    setAttendeeResponses([]);
  };

  const getAnswerDisplay = (response: AttendeeResponse) => {
    if (response.questionType === "multiple-choice" && response.answerIndex !== null && response.options) {
      return response.options[response.answerIndex] || "Unknown";
    }
    return response.answerText || "No answer";
  };

  const handleExportAttendeeReport = () => {
    if (!selectedAttendee) return;

    const report = {
      attendee: {
        name: selectedAttendee.name,
        email: selectedAttendee.email,
        company: selectedAttendee.company,
        title: selectedAttendee.title || "",
        location: selectedAttendee.location || "",
        checkedInAt: selectedAttendee.checked_in_at,
      },
      responses: attendeeResponses.map((r) => ({
        question: r.questionText,
        answer: getAnswerDisplay(r),
        answeredAt: r.answeredAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendee-report-${selectedAttendee.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAttendees = attendees.filter(
    (att) =>
      att.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedAttendee) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Attendees
        </button>

        <div className="mb-8">
          <div className="flex items-start gap-4 p-6 bg-secondary/30 border border-border rounded-2xl mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="mb-1" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {selectedAttendee.name}
              </h2>
              <p className="text-muted-foreground mb-2" style={{ fontSize: "0.9375rem" }}>
                {selectedAttendee.title && `${selectedAttendee.title} at `}{selectedAttendee.company}
              </p>
              <div className="flex flex-wrap gap-4 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                <span>{selectedAttendee.email}</span>
                {selectedAttendee.checked_in_at && (
                  <>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                      Checked in
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedAttendee.checked_in_at).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleExportAttendeeReport}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all"
              style={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>

          <div className="mb-6">
            <h3 className="mb-4" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Responses ({attendeeResponses.length})
            </h3>

            {loadingResponses ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading responses...</p>
              </div>
            ) : attendeeResponses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
                  No responses yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendeeResponses.map((response, index) => (
                  <motion.div
                    key={response.questionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 bg-secondary/30 border border-border rounded-2xl"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="font-medium" style={{ fontSize: "0.9375rem" }}>
                        {response.questionText}
                      </p>
                      <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: "0.75rem" }}>
                        {new Date(response.answeredAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                      <p className="text-primary" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                        {getAnswerDisplay(response)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-8">
        <h2 className="mb-2" style={{ fontSize: "1.875rem", fontWeight: 600 }}>
          Individual Reports
        </h2>
        <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
          View and export attendee-specific response data
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, or email..."
            className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading attendees...</p>
        </div>
      ) : filteredAttendees.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
            {searchQuery ? `No attendees found matching "${searchQuery}"` : "No attendees registered yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttendees.map((attendee, index) => (
            <motion.button
              key={attendee.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleSelectAttendee(attendee)}
              className="p-5 bg-secondary/30 border border-border hover:border-primary/50 rounded-2xl transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center flex-shrink-0 group-hover:from-primary group-hover:to-primary/60 transition-all">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-0.5 truncate" style={{ fontSize: "1rem" }}>
                    {attendee.name}
                  </p>
                  <p className="text-muted-foreground truncate" style={{ fontSize: "0.8125rem" }}>
                    {attendee.company}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {attendee.checked_in_at ? (
                      <span className="flex items-center gap-1 text-[#10b981]" style={{ fontSize: "0.75rem" }}>
                        <CheckCircle2 className="w-3 h-3" />
                        Checked In
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
