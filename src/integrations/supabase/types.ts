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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          points: number
          recommended_frequency: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          points?: number
          recommended_frequency?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          points?: number
          recommended_frequency?: string
          title?: string
        }
        Relationships: []
      }
      actions: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          points: number
          status: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          points?: number
          status?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          points?: number
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
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
          course_id: string | null
          created_at: string
          id: string
          is_active: boolean
          service_id: string | null
        }
        Insert: {
          commission_percent?: number
          commission_type?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          service_id?: string | null
        }
        Update: {
          commission_percent?: number
          commission_type?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_programs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_programs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      ai_provider_credentials: {
        Row: {
          api_key: string | null
          api_style: string
          base_url: string | null
          coach_id: string
          config: Json
          created_at: string
          has_api_key: boolean | null
          id: string
          is_enabled: boolean
          label: string
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_style?: string
          base_url?: string | null
          coach_id: string
          config?: Json
          created_at?: string
          has_api_key?: boolean | null
          id?: string
          is_enabled?: boolean
          label?: string
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_style?: string
          base_url?: string | null
          coach_id?: string
          config?: Json
          created_at?: string
          has_api_key?: boolean | null
          id?: string
          is_enabled?: boolean
          label?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          coach_id: string
          created_at: string
          has_openai_key: boolean | null
          id: string
          image_credential_id: string | null
          image_model: string | null
          max_tokens: number
          model: string
          openai_api_key: string | null
          temperature: number
          text_credential_id: string | null
          text_model: string | null
          updated_at: string
          video_credential_id: string | null
          video_model: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          has_openai_key?: boolean | null
          id?: string
          image_credential_id?: string | null
          image_model?: string | null
          max_tokens?: number
          model?: string
          openai_api_key?: string | null
          temperature?: number
          text_credential_id?: string | null
          text_model?: string | null
          updated_at?: string
          video_credential_id?: string | null
          video_model?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          has_openai_key?: boolean | null
          id?: string
          image_credential_id?: string | null
          image_model?: string | null
          max_tokens?: number
          model?: string
          openai_api_key?: string | null
          temperature?: number
          text_credential_id?: string | null
          text_model?: string | null
          updated_at?: string
          video_credential_id?: string | null
          video_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_image_credential_id_fkey"
            columns: ["image_credential_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_settings_text_credential_id_fkey"
            columns: ["text_credential_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_settings_video_credential_id_fkey"
            columns: ["video_credential_id"]
            isOneToOne: false
            referencedRelation: "ai_provider_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          coach_id: string
          created_at: string
          device: string | null
          event_type: string
          id: string
          path: string | null
          referrer_host: string | null
          session_id: string
          subject_id: string | null
          subject_type: string | null
          user_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          device?: string | null
          event_type: string
          id?: string
          path?: string | null
          referrer_host?: string | null
          session_id: string
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          path?: string | null
          referrer_host?: string | null
          session_id?: string
          subject_id?: string | null
          subject_type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      automation_actions: {
        Row: {
          action_config: Json | null
          action_type: string
          automation_id: string
          created_at: string
          delay_minutes: number | null
          id: string
          sort_order: number
        }
        Insert: {
          action_config?: Json | null
          action_type?: string
          automation_id: string
          created_at?: string
          delay_minutes?: number | null
          id?: string
          sort_order?: number
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          automation_id?: string
          created_at?: string
          delay_minutes?: number | null
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_actions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_event_toggles: {
        Row: {
          channel: string
          coach_id: string
          created_at: string
          event_key: string
          id: string
          is_enabled: boolean
          template_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          coach_id: string
          created_at?: string
          event_key: string
          id?: string
          is_enabled?: boolean
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          coach_id?: string
          created_at?: string
          event_key?: string
          id?: string
          is_enabled?: boolean
          template_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          action_type: string
          automation_id: string | null
          channel: string
          coach_id: string
          created_at: string
          id: string
          metadata: Json | null
          status: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          automation_id?: string | null
          channel: string
          coach_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          automation_id?: string | null
          channel?: string
          coach_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string | null
          channel: string
          coach_id: string
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          channel?: string
          coach_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          channel?: string
          coach_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          channel: string
          coach_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          assignment_rule: Json | null
          badge_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          icon_url: string | null
          id: string
          name: string
          xp_required: number | null
        }
        Insert: {
          assignment_rule?: Json | null
          badge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name: string
          xp_required?: number | null
        }
        Update: {
          assignment_rule?: Json | null
          badge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          xp_required?: number | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      booster_sessions: {
        Row: {
          ai_output: Json | null
          created_at: string
          id: string
          input_text: string
          score: number | null
          type: string
          user_id: string
        }
        Insert: {
          ai_output?: Json | null
          created_at?: string
          id?: string
          input_text?: string
          score?: number | null
          type: string
          user_id: string
        }
        Update: {
          ai_output?: Json | null
          created_at?: string
          id?: string
          input_text?: string
          score?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      builder_pages: {
        Row: {
          coach_id: string
          created_at: string
          css: string
          html: string
          id: string
          is_tenant_home: boolean
          last_prompt: string | null
          meta_description: string | null
          meta_title: string | null
          page_type: string
          prompt: string | null
          published_at: string | null
          service_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          is_tenant_home?: boolean
          last_prompt?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string
          prompt?: string | null
          published_at?: string | null
          service_id?: string | null
          slug: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          css?: string
          html?: string
          id?: string
          is_tenant_home?: boolean
          last_prompt?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string
          prompt?: string | null
          published_at?: string | null
          service_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_pages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          accent_color: string | null
          background_color: string | null
          certificate_text: string | null
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
          linked_course_id: string | null
          linked_section_id: string | null
          linked_service_id: string | null
          logo_url: string | null
          name: string
          signature_url: string | null
          template_style: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          certificate_text?: string | null
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          linked_course_id?: string | null
          linked_section_id?: string | null
          linked_service_id?: string | null
          logo_url?: string | null
          name: string
          signature_url?: string | null
          template_style?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          certificate_text?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          linked_course_id?: string | null
          linked_section_id?: string | null
          linked_service_id?: string | null
          logo_url?: string | null
          name?: string
          signature_url?: string | null
          template_style?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_linked_course_id_fkey"
            columns: ["linked_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_linked_section_id_fkey"
            columns: ["linked_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_linked_service_id_fkey"
            columns: ["linked_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
      channel_access_rules: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          plan_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          rule_type: string
          service_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          plan_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          rule_type: string
          service_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          plan_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          rule_type?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_access_rules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_access_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_access_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_pinned: boolean
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          avatar_url: string | null
          channel_type: string
          coach_id: string | null
          course_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_global: boolean
          name: string
          post_policy: string
          topic: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          avatar_url?: string | null
          channel_type?: string
          coach_id?: string | null
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_global?: boolean
          name: string
          post_policy?: string
          topic?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          avatar_url?: string | null
          channel_type?: string
          coach_id?: string | null
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_global?: boolean
          name?: string
          post_policy?: string
          topic?: string | null
          updated_at?: string
          visibility?: string
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
      chapter_comments: {
        Row: {
          chapter_id: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chapter_comments"
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
          thumbnail_url: string | null
          title: string
          video_description: string | null
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
          thumbnail_url?: string | null
          title: string
          video_description?: string | null
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
          thumbnail_url?: string | null
          title?: string
          video_description?: string | null
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
      cloud_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          last_restored_at: string | null
          mime_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          last_restored_at?: string | null
          mime_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          last_restored_at?: string | null
          mime_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_payment_gateways: {
        Row: {
          coach_id: string
          created_at: string
          currency: string
          environment: string
          has_salt: boolean | null
          has_secret: boolean | null
          has_webhook_secret: boolean | null
          id: string
          is_default: boolean
          is_enabled: boolean
          key_id: string | null
          key_secret: string | null
          provider: string
          salt: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          currency?: string
          environment?: string
          has_salt?: boolean | null
          has_secret?: boolean | null
          has_webhook_secret?: boolean | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          key_id?: string | null
          key_secret?: string | null
          provider: string
          salt?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          currency?: string
          environment?: string
          has_salt?: boolean | null
          has_secret?: boolean | null
          has_webhook_secret?: boolean | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          key_id?: string | null
          key_secret?: string | null
          provider?: string
          salt?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      coach_payment_settings: {
        Row: {
          coach_id: string
          created_at: string
          default_currency: string
          has_razorpay_secret: boolean | null
          id: string
          razorpay_key_id: string | null
          razorpay_key_secret: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          default_currency?: string
          has_razorpay_secret?: boolean | null
          id?: string
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          default_currency?: string
          has_razorpay_secret?: boolean | null
          id?: string
          razorpay_key_id?: string | null
          razorpay_key_secret?: string | null
          updated_at?: string
        }
        Relationships: []
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
          is_pinned: boolean
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
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
      course_blueprint_versions: {
        Row: {
          blueprint_id: string
          created_at: string
          id: string
          note: string | null
          payload: Json
          version: number
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          id?: string
          note?: string | null
          payload: Json
          version: number
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          id?: string
          note?: string | null
          payload?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_blueprint_versions_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "course_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      course_blueprints: {
        Row: {
          audience: string
          coach_id: string
          coach_name: string
          created_at: string
          desired_result: string
          id: string
          language: string
          mode: string
          name: string
          payload: Json | null
          published_course_id: string | null
          starting_pain: string
          status: string
          topic: string
          updated_at: string
          version: number
        }
        Insert: {
          audience?: string
          coach_id: string
          coach_name?: string
          created_at?: string
          desired_result?: string
          id?: string
          language?: string
          mode?: string
          name: string
          payload?: Json | null
          published_course_id?: string | null
          starting_pain?: string
          status?: string
          topic: string
          updated_at?: string
          version?: number
        }
        Update: {
          audience?: string
          coach_id?: string
          coach_name?: string
          created_at?: string
          desired_result?: string
          id?: string
          language?: string
          mode?: string
          name?: string
          payload?: Json | null
          published_course_id?: string | null
          starting_pain?: string
          status?: string
          topic?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_blueprints_published_course_id_fkey"
            columns: ["published_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_duration_days: number | null
          access_level: string
          category: string | null
          coach_id: string
          cover_image_url: string | null
          created_at: string
          default_video_thumbnail_url: string | null
          description: string | null
          disable_comments: boolean
          disable_qna: boolean
          display_order: number
          drip_type: string
          enable_drm: boolean
          id: string
          is_published: boolean
          linked_services: string[] | null
          price: number
          service_id: string | null
          show_as_locked: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_duration_days?: number | null
          access_level?: string
          category?: string | null
          coach_id: string
          cover_image_url?: string | null
          created_at?: string
          default_video_thumbnail_url?: string | null
          description?: string | null
          disable_comments?: boolean
          disable_qna?: boolean
          display_order?: number
          drip_type?: string
          enable_drm?: boolean
          id?: string
          is_published?: boolean
          linked_services?: string[] | null
          price?: number
          service_id?: string | null
          show_as_locked?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_duration_days?: number | null
          access_level?: string
          category?: string | null
          coach_id?: string
          cover_image_url?: string | null
          created_at?: string
          default_video_thumbnail_url?: string | null
          description?: string | null
          disable_comments?: boolean
          disable_qna?: boolean
          display_order?: number
          drip_type?: string
          enable_drm?: boolean
          id?: string
          is_published?: boolean
          linked_services?: string[] | null
          price?: number
          service_id?: string | null
          show_as_locked?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_group_members: {
        Row: {
          added_at: string
          group_id: string
          id: string
          lead_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          id?: string
          lead_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_group_members_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_groups: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_follow_ups: {
        Row: {
          assigned_to: string | null
          coach_id: string
          completed_at: string | null
          created_at: string
          due_date: string
          follow_up_type: string | null
          id: string
          lead_id: string
          status: string
          task: string
        }
        Insert: {
          assigned_to?: string | null
          coach_id: string
          completed_at?: string | null
          created_at?: string
          due_date: string
          follow_up_type?: string | null
          id?: string
          lead_id: string
          status?: string
          task: string
        }
        Update: {
          assigned_to?: string | null
          coach_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string
          follow_up_type?: string | null
          id?: string
          lead_id?: string
          status?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          lead_id: string
          note_type: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          lead_id: string
          note_type?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          city: string | null
          coach_id: string
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          last_scored_at: string | null
          lead_score: number | null
          lead_score_label: string | null
          name: string
          phone: string | null
          pipeline_id: string | null
          pipeline_value: number | null
          source: string | null
          stage_id: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          coach_id: string
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_scored_at?: string | null
          lead_score?: number | null
          lead_score_label?: string | null
          name: string
          phone?: string | null
          pipeline_id?: string | null
          pipeline_value?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          coach_id?: string
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_scored_at?: string | null
          lead_score?: number | null
          lead_score_label?: string | null
          name?: string
          phone?: string | null
          pipeline_id?: string | null
          pipeline_value?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meta_lead_config: {
        Row: {
          coach_id: string
          created_at: string
          default_pipeline_id: string | null
          default_stage_id: string | null
          field_mapping: Json | null
          id: string
          is_active: boolean
          page_id: string | null
          page_name: string | null
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean
          page_id?: string | null
          page_name?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          default_pipeline_id?: string | null
          default_stage_id?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean
          page_id?: string | null
          page_name?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_meta_lead_config_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meta_lead_config_default_stage_id_fkey"
            columns: ["default_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      domain_settings: {
        Row: {
          cf_hostname_id: string | null
          cname_target: string
          coach_id: string
          created_at: string
          domain: string | null
          id: string
          is_live: boolean
          last_checked_at: string | null
          last_error: string | null
          ssl_error: string | null
          ssl_status: string | null
          status: string | null
          updated_at: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          cf_hostname_id?: string | null
          cname_target?: string
          coach_id: string
          created_at?: string
          domain?: string | null
          id?: string
          is_live?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          ssl_error?: string | null
          ssl_status?: string | null
          status?: string | null
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          cf_hostname_id?: string | null
          cname_target?: string
          coach_id?: string
          created_at?: string
          domain?: string | null
          id?: string
          is_live?: boolean
          last_checked_at?: string | null
          last_error?: string | null
          ssl_error?: string | null
          ssl_status?: string | null
          status?: string | null
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      email_account_assignments: {
        Row: {
          account_id: string
          coach_id: string
          created_at: string
          id: string
          purpose: string
          updated_at: string
        }
        Insert: {
          account_id: string
          coach_id: string
          created_at?: string
          id?: string
          purpose: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          purpose?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_account_assignments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          api_domain: string | null
          api_key: string | null
          api_region: string | null
          coach_id: string
          created_at: string
          id: string
          is_default: boolean
          is_platform_default: boolean
          is_verified: boolean
          provider: string
          reply_to_email: string | null
          reply_to_name: string | null
          sender_email: string
          sender_name: string
          smtp_encryption: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string
        }
        Insert: {
          api_domain?: string | null
          api_key?: string | null
          api_region?: string | null
          coach_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_platform_default?: boolean
          is_verified?: boolean
          provider?: string
          reply_to_email?: string | null
          reply_to_name?: string | null
          sender_email: string
          sender_name: string
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Update: {
          api_domain?: string | null
          api_key?: string | null
          api_region?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_platform_default?: boolean
          is_verified?: boolean
          provider?: string
          reply_to_email?: string | null
          reply_to_name?: string | null
          sender_email?: string
          sender_name?: string
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_broadcasts: {
        Row: {
          broadcast_type: string
          coach_id: string
          content: string | null
          created_at: string
          emails_bounced: number
          emails_clicked: number
          emails_delivered: number
          emails_opened: number
          emails_sent: number
          emails_unsubscribed: number
          exclude_filter: Json | null
          id: string
          recipient_filter: Json | null
          recipient_source: string | null
          scheduled_at: string | null
          sender_account_id: string | null
          sent_at: string | null
          status: string
          subject: string
          title: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          broadcast_type?: string
          coach_id: string
          content?: string | null
          created_at?: string
          emails_bounced?: number
          emails_clicked?: number
          emails_delivered?: number
          emails_opened?: number
          emails_sent?: number
          emails_unsubscribed?: number
          exclude_filter?: Json | null
          id?: string
          recipient_filter?: Json | null
          recipient_source?: string | null
          scheduled_at?: string | null
          sender_account_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          title: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          broadcast_type?: string
          coach_id?: string
          content?: string | null
          created_at?: string
          emails_bounced?: number
          emails_clicked?: number
          emails_delivered?: number
          emails_opened?: number
          emails_sent?: number
          emails_unsubscribed?: number
          exclude_filter?: Json | null
          id?: string
          recipient_filter?: Json | null
          recipient_source?: string | null
          scheduled_at?: string | null
          sender_account_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          title?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_broadcasts_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          broadcast_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          recipient_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "email_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_recipients: {
        Row: {
          broadcast_id: string
          clicked_at: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          opened_at: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          broadcast_id: string
          clicked_at?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          broadcast_id?: string
          clicked_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "email_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          coach_id: string | null
          created_at: string
          from_name: string | null
          id: string
          is_active: boolean
          reply_to_email: string | null
          reply_to_name: string | null
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_html: string
          coach_id?: string | null
          created_at?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          reply_to_email?: string | null
          reply_to_name?: string | null
          subject: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          coach_id?: string | null
          created_at?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          reply_to_email?: string | null
          reply_to_name?: string | null
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_test_sends: {
        Row: {
          account_id: string | null
          coach_id: string
          created_at: string
          error: string | null
          id: string
          recipient: string
          subject: string | null
          succeeded: boolean
        }
        Insert: {
          account_id?: string | null
          coach_id: string
          created_at?: string
          error?: string | null
          id?: string
          recipient: string
          subject?: string | null
          succeeded: boolean
        }
        Update: {
          account_id?: string | null
          coach_id?: string
          created_at?: string
          error?: string | null
          id?: string
          recipient?: string
          subject?: string | null
          succeeded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_test_sends_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribed: {
        Row: {
          coach_id: string
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string
          user_id: string | null
        }
        Insert: {
          coach_id: string
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Update: {
          coach_id?: string
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
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
      event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          service_id: string | null
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
          service_id?: string | null
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
          service_id?: string | null
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
          {
            foreignKeyName: "events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      goals: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          pace: string
          starting_monthly_revenue: number
          target_amount: number
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pace?: string
          starting_monthly_revenue?: number
          target_amount: number
          target_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pace?: string
          starting_monthly_revenue?: number
          target_amount?: number
          target_date?: string
          updated_at?: string
          user_id?: string
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
      internal_secrets: {
        Row: {
          created_at: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      issued_certificates: {
        Row: {
          certificate_id: string
          course_name: string | null
          id: string
          issued_at: string
          service_name: string | null
          student_name: string
          template_id: string
          user_id: string
        }
        Insert: {
          certificate_id: string
          course_name?: string | null
          id?: string
          issued_at?: string
          service_name?: string | null
          student_name: string
          template_id: string
          user_id: string
        }
        Update: {
          certificate_id?: string
          course_name?: string | null
          id?: string
          issued_at?: string
          service_name?: string | null
          student_name?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issued_certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          bonuses: Json | null
          certificate_image_url: string | null
          coach_id: string
          coach_name: string
          core_outcome: string
          created_at: string
          cta_form_link: string | null
          facebook_pixel_id: string | null
          ga4_id: string | null
          generated_content: Json | null
          id: string
          mentor_image_url: string | null
          published_at: string | null
          skill: string
          slug: string
          status: string
          target_audience: string
          testimonials: Json | null
          thumbnail_url: string | null
          tracking_enabled: boolean | null
          updated_at: string
          whatsapp_link: string | null
          workshop_date: string | null
          workshop_time: string | null
        }
        Insert: {
          bonuses?: Json | null
          certificate_image_url?: string | null
          coach_id: string
          coach_name?: string
          core_outcome?: string
          created_at?: string
          cta_form_link?: string | null
          facebook_pixel_id?: string | null
          ga4_id?: string | null
          generated_content?: Json | null
          id?: string
          mentor_image_url?: string | null
          published_at?: string | null
          skill?: string
          slug: string
          status?: string
          target_audience?: string
          testimonials?: Json | null
          thumbnail_url?: string | null
          tracking_enabled?: boolean | null
          updated_at?: string
          whatsapp_link?: string | null
          workshop_date?: string | null
          workshop_time?: string | null
        }
        Update: {
          bonuses?: Json | null
          certificate_image_url?: string | null
          coach_id?: string
          coach_name?: string
          core_outcome?: string
          created_at?: string
          cta_form_link?: string | null
          facebook_pixel_id?: string | null
          ga4_id?: string | null
          generated_content?: Json | null
          id?: string
          mentor_image_url?: string | null
          published_at?: string | null
          skill?: string
          slug?: string
          status?: string
          target_audience?: string
          testimonials?: Json | null
          thumbnail_url?: string | null
          tracking_enabled?: boolean | null
          updated_at?: string
          whatsapp_link?: string | null
          workshop_date?: string | null
          workshop_time?: string | null
        }
        Relationships: []
      }
      leaderboard_points: {
        Row: {
          total_points: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          total_points?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          total_points?: number
          updated_at?: string
          user_id?: string
          week_start?: string
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
      login_otps: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
        }
        Relationships: []
      }
      login_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string | null
          location: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          location?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          location?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      monthly_progress: {
        Row: {
          created_at: string
          expenses: number
          goal_id: string
          id: string
          month: string
          profit: number | null
          revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expenses?: number
          goal_id: string
          id?: string
          month: string
          profit?: number | null
          revenue?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expenses?: number
          goal_id?: string
          id?: string
          month?: string
          profit?: number | null
          revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      partnership_requests: {
        Row: {
          created_at: string
          custom_commission: number | null
          id: string
          message: string | null
          program_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          custom_commission?: number | null
          id?: string
          message?: string | null
          program_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          custom_commission?: number | null
          id?: string
          message?: string | null
          program_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "affiliate_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          checkout_origin: string | null
          coach_id: string
          created_at: string
          currency: string
          custom_fields_data: Json | null
          failure_reason: string | null
          gateway_order_id: string
          gateway_payment_id: string | null
          id: string
          paid_at: string | null
          provider: string
          service_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          checkout_origin?: string | null
          coach_id: string
          created_at?: string
          currency?: string
          custom_fields_data?: Json | null
          failure_reason?: string | null
          gateway_order_id: string
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          provider: string
          service_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          checkout_origin?: string | null
          coach_id?: string
          created_at?: string
          currency?: string
          custom_fields_data?: Json | null
          failure_reason?: string | null
          gateway_order_id?: string
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_log: {
        Row: {
          changed_by: string
          created_at: string
          feature_key: string
          id: string
          new_value: boolean
          old_value: boolean | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          feature_key: string
          id?: string
          new_value: boolean
          old_value?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          feature_key?: string
          id?: string
          new_value?: boolean
          old_value?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          brand_name: string | null
          coach_id: string
          created_at: string
          default_currency: string
          email_logo_url: string | null
          favicon_url: string | null
          id: string
          invoice_logo_url: string | null
          logo_url: string | null
          product_name: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          coach_id: string
          created_at?: string
          default_currency?: string
          email_logo_url?: string | null
          favicon_url?: string | null
          id?: string
          invoice_logo_url?: string | null
          logo_url?: string | null
          product_name?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          coach_id?: string
          created_at?: string
          default_currency?: string
          email_logo_url?: string | null
          favicon_url?: string | null
          id?: string
          invoice_logo_url?: string | null
          logo_url?: string | null
          product_name?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          viewed_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          viewed_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          viewed_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          channel_id: string | null
          comments_enabled: boolean
          content: string | null
          created_at: string
          hide_comment_count: boolean
          hide_like_count: boolean
          id: string
          image_url: string | null
          is_feed_post: boolean
          link_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          channel_id?: string | null
          comments_enabled?: boolean
          content?: string | null
          created_at?: string
          hide_comment_count?: boolean
          hide_like_count?: boolean
          id?: string
          image_url?: string | null
          is_feed_post?: boolean
          link_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          channel_id?: string | null
          comments_enabled?: boolean
          content?: string | null
          created_at?: string
          hide_comment_count?: boolean
          hide_like_count?: boolean
          id?: string
          image_url?: string | null
          is_feed_post?: boolean
          link_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          view_count?: number
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
          niche: string | null
          service_level: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          niche?: string | null
          service_level?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          niche?: string | null
          service_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      quest_daily_rituals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      quest_ritual_completions: {
        Row: {
          completed_date: string
          created_at: string
          id: string
          ritual_id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          id?: string
          ritual_id: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          ritual_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_ritual_completions_ritual_id_fkey"
            columns: ["ritual_id"]
            isOneToOne: false
            referencedRelation: "quest_daily_rituals"
            referencedColumns: ["id"]
          },
        ]
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
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_program: {
        Row: {
          attribution_days: number
          currency: string
          id: boolean
          is_active: boolean
          purchase_percent: number
          signup_reward: number
          terms: string | null
          updated_at: string
        }
        Insert: {
          attribution_days?: number
          currency?: string
          id?: boolean
          is_active?: boolean
          purchase_percent?: number
          signup_reward?: number
          terms?: string | null
          updated_at?: string
        }
        Update: {
          attribution_days?: number
          currency?: string
          id?: boolean
          is_active?: boolean
          purchase_percent?: number
          signup_reward?: number
          terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_visits: {
        Row: {
          code: string
          id: string
          landed_at: string
          referrer_id: string
          visitor_key: string | null
        }
        Insert: {
          code: string
          id?: string
          landed_at?: string
          referrer_id: string
          visitor_key?: string | null
        }
        Update: {
          code?: string
          id?: string
          landed_at?: string
          referrer_id?: string
          visitor_key?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          first_purchase_at: string | null
          id: string
          purchase_count: number
          referred_user_id: string
          referrer_id: string
          revenue: number
          reward_amount: number
          reward_status: string
          signed_up_at: string
        }
        Insert: {
          code: string
          first_purchase_at?: string | null
          id?: string
          purchase_count?: number
          referred_user_id: string
          referrer_id: string
          revenue?: number
          reward_amount?: number
          reward_status?: string
          signed_up_at?: string
        }
        Update: {
          code?: string
          first_purchase_at?: string | null
          id?: string
          purchase_count?: number
          referred_user_id?: string
          referrer_id?: string
          revenue?: number
          reward_amount?: number
          reward_status?: string
          signed_up_at?: string
        }
        Relationships: []
      }
      reported_content: {
        Row: {
          action_taken: string | null
          content_id: string
          content_type: string
          created_at: string | null
          description: string | null
          id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          action_taken?: string | null
          content_id: string
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          action_taken?: string | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
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
      role_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
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
      service_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          service_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          service_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_courses_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_users: {
        Row: {
          access_type: string
          amount_paid: number | null
          coupon_code: string | null
          created_at: string
          created_by: string | null
          custom_fields_data: Json | null
          expires_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          purchased_at: string
          service_id: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields_data?: Json | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          purchased_at?: string
          service_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          amount_paid?: number | null
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields_data?: Json | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          purchased_at?: string
          service_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_users_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_workshops: {
        Row: {
          created_at: string
          id: string
          service_id: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_workshops_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_workshops_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          access_duration_days: number | null
          advanced_settings: Json | null
          allow_pay_what_you_want: boolean
          coach_id: string
          collect_address: boolean
          collect_gst: boolean
          cover_image_url: string | null
          cover_video_url: string | null
          created_at: string
          currency: string
          custom_fields: Json | null
          description: string | null
          discounted_price: number | null
          drip_enabled: boolean
          enable_community: boolean
          enable_gamification: boolean
          enable_leaderboard: boolean
          enable_levelup: boolean
          enable_quests: boolean
          enable_subscription: boolean
          enable_terms: boolean
          id: string
          international_currency: string | null
          international_price: number | null
          is_free: boolean
          linked_community_id: string | null
          max_seats: number | null
          min_pay_amount: number | null
          payment_success_button_text: string | null
          payment_success_button_url: string | null
          payment_success_heading: string | null
          payment_success_message: string | null
          payment_success_sections: Json | null
          price: number
          service_tier: string | null
          service_type: string
          slug: string | null
          status: string
          subscription_interval: string | null
          subscription_price: number | null
          terms_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_duration_days?: number | null
          advanced_settings?: Json | null
          allow_pay_what_you_want?: boolean
          coach_id: string
          collect_address?: boolean
          collect_gst?: boolean
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          description?: string | null
          discounted_price?: number | null
          drip_enabled?: boolean
          enable_community?: boolean
          enable_gamification?: boolean
          enable_leaderboard?: boolean
          enable_levelup?: boolean
          enable_quests?: boolean
          enable_subscription?: boolean
          enable_terms?: boolean
          id?: string
          international_currency?: string | null
          international_price?: number | null
          is_free?: boolean
          linked_community_id?: string | null
          max_seats?: number | null
          min_pay_amount?: number | null
          payment_success_button_text?: string | null
          payment_success_button_url?: string | null
          payment_success_heading?: string | null
          payment_success_message?: string | null
          payment_success_sections?: Json | null
          price?: number
          service_tier?: string | null
          service_type?: string
          slug?: string | null
          status?: string
          subscription_interval?: string | null
          subscription_price?: number | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_duration_days?: number | null
          advanced_settings?: Json | null
          allow_pay_what_you_want?: boolean
          coach_id?: string
          collect_address?: boolean
          collect_gst?: boolean
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          description?: string | null
          discounted_price?: number | null
          drip_enabled?: boolean
          enable_community?: boolean
          enable_gamification?: boolean
          enable_leaderboard?: boolean
          enable_levelup?: boolean
          enable_quests?: boolean
          enable_subscription?: boolean
          enable_terms?: boolean
          id?: string
          international_currency?: string | null
          international_price?: number | null
          is_free?: boolean
          linked_community_id?: string | null
          max_seats?: number | null
          min_pay_amount?: number | null
          payment_success_button_text?: string | null
          payment_success_button_url?: string | null
          payment_success_heading?: string | null
          payment_success_message?: string | null
          payment_success_sections?: Json | null
          price?: number
          service_tier?: string | null
          service_type?: string
          slug?: string | null
          status?: string
          subscription_interval?: string | null
          subscription_price?: number | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      support_checklist_progress: {
        Row: {
          checklist_item_id: string
          completed: boolean
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          completed?: boolean
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          completed?: boolean
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "support_stuck_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      support_faq_articles: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_faq_articles_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "support_faq_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_faq_topics: {
        Row: {
          created_at: string
          icon_name: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_settings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          sender_email: string | null
          support_email: string | null
          updated_at: string
          widget_enabled: boolean | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          sender_email?: string | null
          support_email?: string | null
          updated_at?: string
          widget_enabled?: boolean | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          sender_email?: string | null
          support_email?: string | null
          updated_at?: string
          widget_enabled?: boolean | null
        }
        Relationships: []
      }
      support_stuck_areas: {
        Row: {
          color: string
          created_at: string
          description: string
          icon_name: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_stuck_checklist: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_stuck_checklist_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "support_stuck_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      support_stuck_resources: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          resource_type: string
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          resource_type?: string
          sort_order?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_stuck_resources_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "support_stuck_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      support_user_stuck: {
        Row: {
          area_id: string | null
          id: string
          selected_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          id?: string
          selected_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          id?: string
          selected_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_user_stuck_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "support_stuck_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          coach_id: string
          country: string | null
          created_at: string | null
          email: string
          id: string
          invited_at: string | null
          name: string
          permissions: string[] | null
          phone: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          coach_id: string
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          name?: string
          permissions?: string[] | null
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          coach_id?: string
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          name?: string
          permissions?: string[] | null
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          coach_id: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          gateway: string | null
          gateway_txn_id: string | null
          id: string
          item_name: string | null
          metadata: Json | null
          notes: string | null
          occurred_at: string
          service_id: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          coach_id: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          gateway?: string | null
          gateway_txn_id?: string | null
          id?: string
          item_name?: string | null
          metadata?: Json | null
          notes?: string | null
          occurred_at?: string
          service_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          coach_id?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          gateway?: string | null
          gateway_txn_id?: string | null
          id?: string
          item_name?: string | null
          metadata?: Json | null
          notes?: string | null
          occurred_at?: string
          service_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          api_key: string | null
          business_account_id: string | null
          coach_id: string
          created_at: string
          credits_available: number
          id: string
          is_connected: boolean
          phone_number: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          business_account_id?: string | null
          coach_id: string
          created_at?: string
          credits_available?: number
          id?: string
          is_connected?: boolean
          phone_number?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          business_account_id?: string | null
          coach_id?: string
          created_at?: string
          credits_available?: number
          id?: string
          is_connected?: boolean
          phone_number?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string | null
          coach_id: string
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          is_active: boolean
          name: string
          status: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: string | null
          coach_id: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_active?: boolean
          name: string
          status?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string | null
          coach_id?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          is_active?: boolean
          name?: string
          status?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          coach_id: string
          created_at: string
          currency: string
          destination: string | null
          id: string
          method: string | null
          notes: string | null
          processed_at: string | null
          reference: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          coach_id: string
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          coach_id?: string
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_attendees: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          occurrence_id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          occurrence_id: string
          registered_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          occurrence_id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_attendees_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "workshop_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_occurrences: {
        Row: {
          created_at: string
          end_time: string
          id: string
          meeting_link: string | null
          occurrence_number: number
          recording_url: string | null
          start_time: string
          status: string
          total_occurrences: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          meeting_link?: string | null
          occurrence_number?: number
          recording_url?: string | null
          start_time: string
          status?: string
          total_occurrences?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          meeting_link?: string | null
          occurrence_number?: number
          recording_url?: string | null
          start_time?: string
          status?: string
          total_occurrences?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_occurrences_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          occurrence_id: string
          recording_url: string | null
          uploaded_to_course: boolean
          workshop_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          occurrence_id: string
          recording_url?: string | null
          uploaded_to_course?: boolean
          workshop_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          occurrence_id?: string
          recording_url?: string | null
          uploaded_to_course?: boolean
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_recordings_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "workshop_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_recordings_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_recurrence_rules: {
        Row: {
          created_at: string
          days_of_week: string[] | null
          end_date: string | null
          end_type: string
          frequency: string
          id: string
          interval_value: number
          month_day: number | null
          month_week_day: string | null
          occurrence_count: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: string[] | null
          end_date?: string | null
          end_type?: string
          frequency?: string
          id?: string
          interval_value?: number
          month_day?: number | null
          month_week_day?: string | null
          occurrence_count?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: string[] | null
          end_date?: string | null
          end_type?: string
          frequency?: string
          id?: string
          interval_value?: number
          month_day?: number | null
          month_week_day?: string | null
          occurrence_count?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_recurrence_rules_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          auto_recording: boolean
          auto_upload_to_course: boolean
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          enable_waiting_room: boolean
          id: string
          is_recurring: boolean
          linked_course_id: string | null
          meeting_link: string | null
          meeting_type: string
          start_date: string
          start_time: string
          status: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_recording?: boolean
          auto_upload_to_course?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          enable_waiting_room?: boolean
          id?: string
          is_recurring?: boolean
          linked_course_id?: string | null
          meeting_link?: string | null
          meeting_type?: string
          start_date: string
          start_time: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          auto_recording?: boolean
          auto_upload_to_course?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          enable_waiting_room?: boolean
          id?: string
          is_recurring?: boolean
          linked_course_id?: string | null
          meeting_link?: string | null
          meeting_type?: string
          start_date?: string
          start_time?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_linked_course_id_fkey"
            columns: ["linked_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      zoom_settings: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          updated_at: string
          zoom_account_id: string | null
          zoom_client_id: string | null
          zoom_client_secret: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          updated_at?: string
          zoom_account_id?: string | null
          zoom_client_id?: string | null
          zoom_client_secret?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          updated_at?: string
          zoom_account_id?: string | null
          zoom_client_id?: string | null
          zoom_client_secret?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      coach_payment_methods: {
        Row: {
          coach_id: string | null
          currency: string | null
          environment: string | null
          is_default: boolean | null
          provider: string | null
        }
        Insert: {
          coach_id?: string | null
          currency?: string | null
          environment?: string | null
          is_default?: boolean | null
          provider?: string | null
        }
        Update: {
          coach_id?: string | null
          currency?: string | null
          environment?: string | null
          is_default?: boolean | null
          provider?: string | null
        }
        Relationships: []
      }
      coach_sales_summary: {
        Row: {
          coach_id: string | null
          gross_sales: number | null
          net_earnings: number | null
          refund_count: number | null
          sale_count: number | null
          total_refunded: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      belongs_to_tenant: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      brand_prefix: { Args: { name: string }; Returns: string }
      can_access_channel: {
        Args: { channel: string; viewer: string }
        Returns: boolean
      }
      can_post_in_channel: {
        Args: { channel: string; viewer: string }
        Returns: boolean
      }
      certificate_prefix: { Args: { template: string }; Returns: string }
      conversation_summaries: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          last_at: string
          last_message: string
          last_sender_id: string
          other_user_id: string
          unread_count: number
        }[]
      }
      dearmor: { Args: { "": string }; Returns: string }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_course_access: {
        Args: { course: string; viewer: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_staff: { Args: { viewer: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { _other_user_id: string }
        Returns: undefined
      }
      may_use_domain: {
        Args: { _hostname: string; _user_id: string }
        Returns: boolean
      }
      messageable_people: {
        Args: { _search?: string }
        Returns: {
          avatar_url: string
          full_name: string
          relationship: string
          user_id: string
        }[]
      }
      my_referral_code: { Args: never; Returns: string }
      my_referral_stats: {
        Args: never
        Returns: {
          buyers: number
          revenue: number
          reward_approved: number
          reward_paid: number
          reward_pending: number
          signups: number
          visits: number
        }[]
      }
      my_referrals: {
        Args: never
        Returns: {
          display_name: string
          first_purchase_at: string
          id: string
          purchase_count: number
          revenue: number
          reward_amount: number
          reward_status: string
          signed_up_at: string
        }[]
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      profile_display_name: {
        Args: { email: string; full_name: string }
        Returns: string
      }
      record_referral_visit: {
        Args: { _code: string; _visitor_key?: string }
        Returns: boolean
      }
      unread_message_count: { Args: never; Returns: number }
      user_has_levelup_access: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "coach" | "student" | "super_admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "coach", "student", "super_admin"],
    },
  },
} as const
