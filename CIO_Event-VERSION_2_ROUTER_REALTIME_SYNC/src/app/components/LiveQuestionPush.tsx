import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Sparkles, CheckCircle2 } from "lucide-react";

interface PushedQuestion {
  id: string | number;
  text: string;
  type: "multiple-choice" | "text";
  options?: string[];
  timestamp: number;
}

interface LiveQuestionPushProps {
  isVisible: boolean;
  question: PushedQuestion | null;
  onAnswer: () => void;
  onDismiss: () => void;
}

export function LiveQuestionPush({ isVisible, question, onAnswer, onDismiss }: LiveQuestionPushProps) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    console.log("[Popup] Props changed - isVisible:", isVisible, "question:", question?.id);
    
    if (isVisible && question) {
      console.log("[Popup] Showing popup for question:", question.text);
      setShowPopup(true);
    }
  }, [isVisible, question]);

  if (!showPopup || !question) {
    console.log("[Popup] Not showing - showPopup:", showPopup, "question:", question);
    return null;
  }

  console.log("[Popup] Rendering popup!");

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '32rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
            <div className="relative bg-gradient-to-b from-[#14161f] to-[#0a0c14] border-2 border-primary/40 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20"
              style={{
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

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

              <div className="relative z-10 p-6 md:p-8">
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }}
                  className="mb-6 flex justify-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 0.7, 0.4]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-primary/40 rounded-full blur-xl"
                    />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                      <MessageSquare className="w-10 h-10 text-white" strokeWidth={2} />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-primary" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      NEW QUESTION
                    </span>
                  </div>

                  <h2 className="mb-3" style={{ fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.3 }}>
                    Live Poll Active
                  </h2>
                  <p className="text-muted-foreground mb-6" style={{ fontSize: "1.0625rem", lineHeight: 1.6 }}>
                    The host has sent a question for all attendees
                  </p>

                  <div className="p-5 bg-secondary/40 border border-border rounded-2xl mb-2">
                    <p className="text-foreground mb-4" style={{ fontSize: "1.0625rem", lineHeight: 1.6, fontWeight: 500 }}>
                      {question.text}
                    </p>
                    {question.type === "multiple-choice" && question.options && (
                      <div className="space-y-2">
                        {question.options.slice(0, 2).map((option, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg"
                          >
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                              {option}
                            </span>
                          </div>
                        ))}
                        {question.options.length > 2 && (
                          <p className="text-muted-foreground text-center" style={{ fontSize: "0.8125rem" }}>
                            +{question.options.length - 2} more options
                          </p>
                        )}
                      </div>
                    )}
                    {question.type === "text" && (
                      <div className="p-3 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
                        <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                          Text response required
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-6" style={{ fontSize: "0.8125rem" }}>
                    Your input helps shape the conversation
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <button
                    onClick={onAnswer}
                    className="w-full py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-lg shadow-primary/30"
                    style={{ fontSize: "1.125rem", fontWeight: 600 }}
                  >
                    Answer Now
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    I'll answer later
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 text-center"
                >
                  <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
                    This helps us understand your priorities and experiences
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
  );
}
