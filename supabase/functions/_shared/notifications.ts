// Which real event sends which email.
//
// Forty-three templates were designed, seeded and editable, and five of them
// were ever sent by anything. The rest existed only as rows: a coach could
// spend an afternoon editing "Badge earned" and no learner would ever receive
// it. This is the missing half — the map from something happening to the
// message that goes out about it.
//
// Pure data, no Deno APIs, so the app's test suite can import it and assert
// that every template in the library is actually reachable.

/** Who the message is addressed to. */
export type Audience =
  /** The learner, buyer or member the thing happened to. */
  | "learner"
  /** The coach who owns the academy — "you made a sale", not "you bought". */
  | "coach";

/** Where the send is initiated from. */
export type Trigger =
  /** An edge function already handling the event: payments, sign-in, webhooks. */
  | "server"
  /** The app, immediately after the write that caused it succeeded. */
  | "app"
  /** A clock, because the event is a date arriving rather than an action. */
  | "scheduled";

export interface NotificationSpec {
  /** Stable name a caller passes to the notify function. */
  event: string;
  audience: Audience;
  trigger: Trigger;
  /**
   * Variables the caller must supply. The dispatcher fills the rest —
   * full_name, academy_name, coach_name, year and any link it can build.
   */
  required: string[];
  /** Why this exists, in the terms a coach would describe it. */
  about: string;
}

/**
 * Variables every template gets without anyone passing them.
 *
 * Every template ends with the same footer, so every template needs these; a
 * caller forgetting one would print a literal {{academy_name}} in an inbox.
 */
export const AUTO_VARIABLES = ["full_name", "academy_name", "coach_name", "year"] as const;

/** Links the dispatcher can build from the site address alone. */
export const AUTO_LINKS: Record<string, string> = {
  dashboard_link: "/dashboard",
  login_link: "/login",
  badges_link: "/gamification",
  leaderboard_link: "/leaderboard",
  billing_link: "/settings/billing",
  renew_link: "/settings/billing",
  update_payment_link: "/settings/billing",
  booking_link: "/events",
  conversation_link: "/messages",
};

export const NOTIFICATIONS: Record<string, NotificationSpec> = {
  // ---------------------------------------------------------- account ---
  welcome_email: {
    event: "member.joined",
    audience: "learner",
    trigger: "app",
    required: [],
    about: "Someone joined the academy.",
  },
  account_created: {
    event: "account.created_at_checkout",
    audience: "learner",
    trigger: "server",
    required: ["email", "temporary_password"],
    about: "A buyer had no account, so one was made for them at checkout.",
  },
  password_reset: {
    event: "account.password_reset",
    audience: "learner",
    trigger: "server",
    required: ["reset_link", "expiry_minutes"],
    about: "A password reset was requested.",
  },
  login_otp: {
    event: "account.login_code",
    audience: "learner",
    trigger: "server",
    required: ["otp_code", "expiry_minutes"],
    about: "A one-time sign-in code.",
  },
  team_invite: {
    event: "team.invited",
    audience: "learner",
    trigger: "app",
    required: ["inviter_name", "role_name", "accept_link", "expiry_days"],
    about: "Someone was invited into the team.",
  },

  // ---------------------------------------------------------- payment ---
  payment_receipt: {
    event: "payment.succeeded",
    audience: "learner",
    trigger: "server",
    required: ["amount", "item_name", "transaction_id", "payment_date", "payment_method"],
    about: "A payment cleared; this is the buyer's receipt.",
  },
  sale_notification: {
    event: "payment.succeeded",
    audience: "coach",
    trigger: "server",
    required: ["buyer_name", "buyer_email", "item_name", "amount", "payment_method", "transaction_id"],
    about: "The same payment, told to the coach who earned it.",
  },
  service_purchase_confirmed: {
    event: "payment.succeeded",
    audience: "learner",
    trigger: "server",
    required: ["service_name", "amount"],
    about: "What the buyer now has access to.",
  },
  payment_failed: {
    event: "payment.failed",
    audience: "learner",
    trigger: "server",
    required: ["plan_name", "amount", "retry_date"],
    about: "A charge did not go through.",
  },
  refund_processed: {
    event: "payment.refunded",
    audience: "learner",
    trigger: "server",
    required: ["item_name", "amount", "refund_date", "transaction_id"],
    about: "Money went back.",
  },
  abandoned_checkout: {
    event: "checkout.abandoned",
    audience: "learner",
    trigger: "scheduled",
    required: ["course_name", "amount", "checkout_link"],
    about: "A checkout was opened and not finished.",
  },
  subscription_renewal_reminder: {
    event: "subscription.renewing",
    audience: "learner",
    trigger: "scheduled",
    required: ["plan_name", "amount", "renewal_date"],
    about: "A subscription renews soon.",
  },
  subscription_expired: {
    event: "subscription.expired",
    audience: "learner",
    trigger: "scheduled",
    required: ["plan_name", "expiry_date"],
    about: "A subscription lapsed.",
  },

  // ----------------------------------------------------------- course ---
  course_enrollment: {
    event: "course.enrolled",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "lesson_count", "course_link"],
    about: "Someone joined a course.",
  },
  new_lesson_available: {
    event: "course.lesson_published",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "lesson_name", "lesson_duration", "lesson_link"],
    about: "A new lesson went live in a course they are taking.",
  },
  course_progress_milestone: {
    event: "course.milestone_reached",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "progress_percent", "lessons_completed", "resume_link"],
    about: "A learner crossed a quarter, half or three quarters of a course.",
  },
  course_completed: {
    event: "course.completed",
    audience: "learner",
    trigger: "app",
    required: [
      "course_name",
      "lessons_completed",
      "time_invested",
      // The email points at what to do next, so the caller has to know what
      // that is — there is no sensible default for "another course".
      "next_course_name",
      "next_course_link",
    ],
    about: "Every lesson in a course is finished.",
  },
  certificate_issued: {
    event: "course.certificate_issued",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "completion_date", "certificate_link"],
    about: "A certificate was issued.",
  },
  course_reminder: {
    event: "course.idle",
    audience: "learner",
    trigger: "scheduled",
    required: ["course_name", "lesson_name", "progress_percent", "resume_link"],
    about: "A course was started and then left alone.",
  },
  course_progress_digest: {
    event: "course.weekly_digest",
    audience: "learner",
    trigger: "scheduled",
    required: ["course_name", "lessons_this_week", "progress_percent", "streak_days", "resume_link"],
    about: "A weekly summary of what they got through.",
  },
  course_access_expiring: {
    event: "course.access_expiring",
    audience: "learner",
    trigger: "scheduled",
    required: ["course_name", "expiry_date", "days_left", "progress_percent"],
    about: "Time-limited access is running out.",
  },

  // ------------------------------------------------------- assignment ---
  assignment_submitted: {
    event: "assignment.submitted",
    audience: "coach",
    trigger: "app",
    required: ["course_name", "assignment_name", "submitted_at", "review_window"],
    about: "A learner handed something in.",
  },
  assignment_reviewed: {
    event: "assignment.reviewed",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "assignment_name", "grade", "reviewer_name", "feedback_link"],
    about: "Their submission was marked.",
  },
  qna_reply: {
    event: "course.qna_replied",
    audience: "learner",
    trigger: "app",
    required: ["course_name", "lesson_name", "replier_name", "reply_excerpt", "thread_link"],
    about: "Someone answered their question.",
  },

  // ------------------------------------------------------------ event ---
  event_registration_confirmed: {
    event: "event.registered",
    audience: "learner",
    trigger: "app",
    required: ["event_name", "event_date", "event_time", "duration", "join_link", "calendar_link"],
    about: "A place is booked.",
  },
  event_reminder: {
    event: "event.starting_soon",
    audience: "learner",
    trigger: "scheduled",
    required: ["event_name", "event_time", "event_date", "duration", "join_link"],
    about: "Something they registered for starts shortly.",
  },
  workshop_scheduled: {
    event: "workshop.scheduled",
    audience: "learner",
    trigger: "app",
    required: ["workshop_name", "event_date", "event_time", "duration", "session_count", "join_link"],
    about: "Dates were set for a workshop.",
  },
  workshop_rescheduled: {
    event: "workshop.rescheduled",
    audience: "learner",
    trigger: "app",
    required: ["workshop_name", "previous_date", "event_date", "event_time", "join_link"],
    about: "A workshop moved.",
  },
  workshop_cancelled: {
    event: "workshop.cancelled",
    audience: "learner",
    trigger: "app",
    required: ["workshop_name", "event_date", "refund_note"],
    about: "A workshop is not happening.",
  },
  workshop_reminder: {
    event: "workshop.starting_soon",
    audience: "learner",
    trigger: "scheduled",
    required: ["workshop_name", "session_number", "total_sessions", "start_time", "join_link"],
    about: "A workshop session starts shortly.",
  },
  recording_available: {
    event: "workshop.recording_ready",
    audience: "learner",
    trigger: "app",
    required: ["session_name", "recording_length", "recording_link", "available_until"],
    about: "The recording of a session they could attend is up.",
  },
  consultation_booked: {
    event: "consultation.booked",
    audience: "learner",
    trigger: "app",
    required: ["session_name", "event_date", "event_time", "duration", "join_link", "calendar_link"],
    about: "A one-to-one is in the diary.",
  },
  consultation_reminder: {
    event: "consultation.starting_soon",
    audience: "learner",
    trigger: "scheduled",
    required: ["event_time", "duration", "join_link"],
    about: "That one-to-one is about to start.",
  },
  consultation_cancelled: {
    event: "consultation.cancelled",
    audience: "learner",
    trigger: "app",
    required: ["session_name", "event_date", "event_time"],
    about: "A one-to-one was called off.",
  },

  // ------------------------------------------------------- community ---
  post_published: {
    event: "community.post_published",
    audience: "learner",
    trigger: "app",
    required: ["author_name", "post_title", "post_excerpt", "post_link"],
    about: "Something new to read in the community.",
  },
  post_comment: {
    event: "community.post_commented",
    audience: "learner",
    trigger: "app",
    required: ["commenter_name", "post_title", "comment_excerpt", "post_link"],
    about: "Someone commented on their post.",
  },
  comment_reply: {
    event: "community.comment_replied",
    audience: "learner",
    trigger: "app",
    required: ["replier_name", "comment_excerpt", "post_title", "post_link"],
    about: "Someone replied to their comment.",
  },
  comment_like: {
    event: "community.comment_liked",
    audience: "learner",
    trigger: "app",
    required: ["liker_name", "comment_excerpt", "post_title", "post_link"],
    about: "Someone liked their comment.",
  },
  comment_mention: {
    event: "community.mentioned",
    audience: "learner",
    trigger: "app",
    required: ["mentioner_name", "comment_excerpt", "post_title", "post_link"],
    about: "They were named in a comment.",
  },
  new_message: {
    event: "message.received",
    audience: "learner",
    trigger: "app",
    required: ["sender_name", "message_excerpt"],
    about: "A direct message arrived.",
  },
  service_announcement: {
    event: "service.announced",
    audience: "learner",
    trigger: "app",
    required: ["service_name", "service_description", "price", "service_link"],
    about: "The coach launched something new.",
  },

  // ---------------------------------------------------- gamification ---
  badge_earned: {
    event: "gamification.badge_earned",
    audience: "learner",
    trigger: "app",
    required: ["badge_name", "badge_description", "xp_earned", "total_xp"],
    about: "A badge was unlocked.",
  },
  level_up: {
    event: "gamification.level_up",
    audience: "learner",
    trigger: "app",
    required: ["level_number", "level_name", "total_xp", "next_level_name", "xp_to_next"],
    about: "They reached a new level.",
  },
  streak_milestone: {
    event: "gamification.streak_milestone",
    audience: "learner",
    trigger: "app",
    required: ["streak_days", "xp_bonus", "resume_link"],
    about: "A streak hit a round number.",
  },
};

/** Every template key the registry knows how to send. */
export const NOTIFIED_TEMPLATES = Object.keys(NOTIFICATIONS);

/** The templates one event sends — a payment tells the buyer and the coach. */
export function templatesForEvent(event: string): string[] {
  return NOTIFIED_TEMPLATES.filter((key) => NOTIFICATIONS[key].event === event);
}

/** Every distinct event name a caller may raise. */
export const NOTIFICATION_EVENTS = [
  ...new Set(NOTIFIED_TEMPLATES.map((key) => NOTIFICATIONS[key].event)),
].sort();
