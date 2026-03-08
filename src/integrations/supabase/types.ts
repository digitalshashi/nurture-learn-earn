export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      affiliate_bank_details: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          link_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          link_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          created_at: string
          id: string
          program_id: string
          referral_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          referral_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          referral_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          remark: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          remark?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          remark?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_programs: {
        Row: {
          commission_percent: number
          commission_type: string
          course_id: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          commission_percent?: number
          commission_type?: string
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          commission_percent?: number
          commission_type?: string
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_programs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          amount_paid: number
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          commission_earned: number
          coupon_code: string | null
          course_id: string
          id: string
          link_id: string
          purchased_at: string
        }
        Insert: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_earned?: number
          coupon_code?: string | null
          course_id: string
          id?: string
          link_id: string
          purchased_at?: string
        }
        Update: {
          amount_paid?: number
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_earned?: number
          coupon_code?: string | null
          course_id?: string
          id?: string
          link_id?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          answer: string | null
          assignment_id: string
          graded_at: string | null
          id: string
          score: number | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          assignment_id: string
          graded_at?: string | null
          id?: string
          score?: number | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          assignment_id?: string
          graded_at?: string | null
          id?: string
          score?: number | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          chapter_id: string
          created_at: string
          description: string | null
          id: string
          max_retakes: number | null
          passing_score: number | null
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string | null
          id?: string
          max_retakes?: number | null
          passing_score?: number | null
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string | null
          id?: string
          max_retakes?: number | null
          passing_score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_required: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          xp_required?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_required?: number | null
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string | null
          completed_at: string | null
          id: string
          is_completed: boolean | null
          joined_at: string | null
          progress_percent: number | null
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          progress_percent?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          progress_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "gamification_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_type: string
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean
          name: string
        }
        Insert: {
          channel_type?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          name: string
        }
        Update: {
          channel_type?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_progress: {
        Row: {
          chapter_id: string
          completed: boolean
          id: string
          last_position_seconds: number | null
          progress_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed?: boolean
          id?: string
          last_position_seconds?: number | null
          progress_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed?: boolean
          id?: string
          last_position_seconds?: number | null
          progress_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          assignment_config: Json | null
          content: string | null
          content_type: string
          created_at: string
          drip_date: string | null
          drip_delay_days: number | null
          duration_seconds: number | null
          id: string
          is_assignment: boolean
          resources: Json | null
          section_id: string
          sort_order: number
          title: string
          video_type: string | null
          video_url: string | null
        }
        Insert: {
          assignment_config?: Json | null
          content?: string | null
          content_type?: string
          created_at?: string
          drip_date?: string | null
          drip_delay_days?: number | null
          duration_seconds?: number | null
          id?: string
          is_assignment?: boolean
          resources?: Json | null
          section_id: string
          sort_order?: number
          title: string
          video_type?: string | null
          video_url?: string | null
        }
        Update: {
          assignment_config?: Json | null
          content?: string | null
          content_type?: string
          created_at?: string
          drip_date?: string | null
          drip_delay_days?: number | null
          duration_seconds?: number | null
          id?: string
          is_assignment?: boolean
          resources?: Json | null
          section_id?: string
          sort_order?: number
          title?: string
          video_type?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_logs: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          date: string
          id: string
          organization_name: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string
          id?: string
          organization_name: string
          user_id: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string
          id?: string
          organization_name?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbot_questions: {
        Row: {
          bot_answer: string | null
          course_id: string
          created_at: string
          id: string
          is_satisfied: boolean | null
          question: string
          user_id: string
        }
        Insert: {
          bot_answer?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_satisfied?: boolean | null
          question: string
          user_id: string
        }
        Update: {
          bot_answer?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_satisfied?: boolean | null
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      checkup_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      checkup_submissions: {
        Row: {
          actions_completed: number | null
          actions_total: number | null
          checkup_id: string | null
          id: string
          notes: string | null
          score: number | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          actions_completed?: number | null
          actions_total?: number | null
          checkup_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          actions_completed?: number | null
          actions_total?: number | null
          checkup_id?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkup_submissions_checkup_id_fkey"
            columns: ["checkup_id"]
            isOneToOne: false
            referencedRelation: "checkup_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_subscriptions: {
        Row: {
          assigned_by: string
          coach_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          coach_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          coach_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          brand_color: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_duration_days: number | null
          category: string | null
          coach_id: string
          cover_image_url: string | null
          created_at: string
          default_video_thumbnail_url: string | null
          description: string | null
          disable_comments: boolean
          disable_qna: boolean
          drip_type: string
          enable_drm: boolean
          id: string
          is_published: boolean
          linked_services: string[] | null
          price: number
          show_as_locked: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_duration_days?: number | null
          category?: string | null
          coach_id: string
          cover_image_url?: string | null
          created_at?: string
          default_video_thumbnail_url?: string | null
          description?: string | null
          disable_comments?: boolean
          disable_qna?: boolean
          drip_type?: string
          enable_drm?: boolean
          id?: string
          is_published?: boolean
          linked_services?: string[] | null
          price?: number
          show_as_locked?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_duration_days?: number | null
          category?: string | null
          coach_id?: string
          cover_image_url?: string | null
          created_at?: string
          default_video_thumbnail_url?: string | null
          description?: string | null
          disable_comments?: boolean
          disable_qna?: boolean
          drip_type?: string
          enable_drm?: boolean
          id?: string
          is_published?: boolean
          linked_services?: string[] | null
          price?: number
          show_as_locked?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string
          id: string
          meeting_link: string | null
          meeting_type: string
          occurrence_number: number | null
          recurrence_rule: string | null
          recurring: boolean
          start_time: string
          status: string
          title: string
          total_occurrences: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time: string
          id?: string
          meeting_link?: string | null
          meeting_type?: string
          occurrence_number?: number | null
          recurrence_rule?: string | null
          recurring?: boolean
          start_time: string
          status?: string
          title: string
          total_occurrences?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string
          id?: string
          meeting_link?: string | null
          meeting_type?: string
          occurrence_number?: number | null
          recurrence_rule?: string | null
          recurring?: boolean
          start_time?: string
          status?: string
          title?: string
          total_occurrences?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_challenges: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed_date: string
          created_at: string | null
          habit_id: string | null
          id: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          completed_date?: string
          created_at?: string | null
          habit_id?: string | null
          id?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          completed_date?: string
          created_at?: string | null
          habit_id?: string | null
          id?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          time_of_day: string | null
          user_id: string
          xp_value: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          time_of_day?: string | null
          user_id: string
          xp_value?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          time_of_day?: string | null
          user_id?: string
          xp_value?: number | null
        }
        Relationships: []
      }
      level_definitions: {
        Row: {
          badge_name: string | null
          created_at: string | null
          id: string
          level_number: number
          reward_description: string | null
          xp_required: number
        }
        Insert: {
          badge_name?: string | null
          created_at?: string | null
          id?: string
          level_number: number
          reward_description?: string | null
          xp_required: number
        }
        Update: {
          badge_name?: string | null
          created_at?: string | null
          id?: string
          level_number?: number
          reward_description?: string | null
          xp_required?: number
        }
        Relationships: []
      }
      navigation_menu: {
        Row: {
          created_at: string
          created_by: string
          icon_name: string
          id: string
          is_enabled: boolean
          label: string
          link: string
          sort_order: number
          updated_at: string
          visible_roles: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          icon_name?: string
          id?: string
          is_enabled?: boolean
          label: string
          link?: string
          sort_order?: number
          updated_at?: string
          visible_roles?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          icon_name?: string
          id?: string
          is_enabled?: boolean
          label?: string
          link?: string
          sort_order?: number
          updated_at?: string
          visible_roles?: string[]
        }
        Relationships: []
      }
      posts: {
        Row: {
          channel_id: string | null
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_feed_post: boolean
          link_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          channel_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_feed_post?: boolean
          link_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          channel_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_feed_post?: boolean
          link_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_data: {
        Row: {
          ad_spends: number | null
          avg_cost_per_lead: number | null
          created_at: string | null
          date: string
          id: string
          revenue_earned: number | null
          roas: number | null
          total_group_size: number | null
          total_leads: number | null
          total_paid_customers: number | null
          user_id: string
        }
        Insert: {
          ad_spends?: number | null
          avg_cost_per_lead?: number | null
          created_at?: string | null
          date: string
          id?: string
          revenue_earned?: number | null
          roas?: number | null
          total_group_size?: number | null
          total_leads?: number | null
          total_paid_customers?: number | null
          user_id: string
        }
        Update: {
          ad_spends?: number | null
          avg_cost_per_lead?: number | null
          created_at?: string | null
          date?: string
          id?: string
          revenue_earned?: number | null
          roas?: number | null
          total_group_size?: number | null
          total_leads?: number | null
          total_paid_customers?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          chapter_id: string
          created_at: string
          id: string
          is_resolved: boolean
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          chapter_id: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          chapter_id?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          coach_reply: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          coach_reply?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          coach_reply?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          allowed_modules: string[]
          billing_type: string
          commission_percent: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_courses: number | null
          max_students: number | null
          monthly_price: number
          name: string
          sort_order: number
          storage_limit_mb: number | null
          updated_at: string
          yearly_price: number
        }
        Insert: {
          allowed_modules?: string[]
          billing_type?: string
          commission_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_courses?: number | null
          max_students?: number | null
          monthly_price?: number
          name: string
          sort_order?: number
          storage_limit_mb?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          allowed_modules?: string[]
          billing_type?: string
          commission_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_courses?: number | null
          max_students?: number | null
          monthly_price?: number
          name?: string
          sort_order?: number
          storage_limit_mb?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          drip_date: string | null
          drip_delay_days: number | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          drip_date?: string | null
          drip_delay_days?: number | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          drip_date?: string | null
          drip_delay_days?: number | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          name: string
          user_id: string
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          name: string
          user_id: string
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          name?: string
          user_id?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_rules: {
        Row: {
          action_name: string
          created_at: string | null
          daily_limit: number | null
          id: string
          is_enabled: boolean | null
          xp_value: number
        }
        Insert: {
          action_name: string
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          xp_value?: number
        }
        Update: {
          action_name?: string
          created_at?: string | null
          daily_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          xp_value?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_community_role: {
        Args: { _community_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "student"
      community_role: "owner" | "moderator" | "student" | "affiliate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "student"],
      community_role: ["owner", "moderator", "student", "affiliate"],
    },
  },
} as const
