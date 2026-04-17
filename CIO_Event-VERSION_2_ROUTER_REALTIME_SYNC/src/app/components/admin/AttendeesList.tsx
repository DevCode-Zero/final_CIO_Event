import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, CheckCircle2, Clock, User, MapPin, RefreshCw } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { db, type Attendee } from "../../utils/database";

export function AttendeesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadAttendees = async () => {
    try {
      const data = await db.getAttendees();
      setAttendees(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to load attendees:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAttendees();

    const channel = supabase
      .channel('attendees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendees'
        },
        (payload) => {
          console.log("Attendee change detected:", payload);
          loadAttendees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAttendees = attendees.filter(
    (attendee) =>
      attendee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendee.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setLoading(true);
    loadAttendees();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="mb-1" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Attendees
          </h2>
          <p className="text-muted-foreground" style={{ fontSize: "0.9375rem" }}>
            {attendees.length} registered • {attendees.filter(a => a.checked_in_at).length} checked in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
        <div className="space-y-3">
          {filteredAttendees.map((attendee, index) => (
            <motion.div
              key={attendee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-5 bg-secondary/30 border border-border hover:border-primary/30 rounded-2xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="mb-0.5" style={{ fontSize: "1.0625rem", fontWeight: 600 }}>
                        {attendee.name}
                      </p>
                      {attendee.title && (
                        <p className="text-muted-foreground mb-1" style={{ fontSize: "0.875rem" }}>
                          {attendee.title}
                        </p>
                      )}
                      <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                        {attendee.company}
                      </p>
                    </div>

                    {attendee.checked_in_at ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-primary" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                          Checked In
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border border-border rounded-full">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground" style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                          Pending
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
                    <span>{attendee.email}</span>
                    {attendee.checked_in_at && (
                      <>
                        <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(attendee.checked_in_at).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                    {attendee.location && (
                      <>
                        <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {attendee.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
