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
  public: {
    Tables: {
      certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          meta: Json
          title: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          meta?: Json
          title: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          meta?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_offerings: {
        Row: {
          access_percent: number
          created_at: string
          duration_minutes: number
          id: string
          included_in_subscription: boolean
          mode: Database["public"]["Enums"]["coaching_mode"]
          name: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_cents: number
          program_id: string | null
          session_count: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          access_percent?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          included_in_subscription?: boolean
          mode?: Database["public"]["Enums"]["coaching_mode"]
          name: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          program_id?: string | null
          session_count?: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          access_percent?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          included_in_subscription?: boolean
          mode?: Database["public"]["Enums"]["coaching_mode"]
          name?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          program_id?: string | null
          session_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_offerings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_notes: string | null
          created_at: string
          duration_minutes: number
          focus: string | null
          id: string
          meeting_url: string | null
          package_id: string
          package_name: string
          price_cents: number | null
          scheduled_at: string
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          duration_minutes?: number
          focus?: string | null
          id?: string
          meeting_url?: string | null
          package_id: string
          package_name: string
          price_cents?: number | null
          scheduled_at: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          duration_minutes?: number
          focus?: string | null
          id?: string
          meeting_url?: string | null
          package_id?: string
          package_name?: string
          price_cents?: number | null
          scheduled_at?: string
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_attempts: {
        Row: {
          archived_at: string
          attempt_index: number
          completed_at: string | null
          course_id: string
          days_completed: number
          days_total: number
          id: string
          lessons_completed: number
          lessons_total: number
          snapshot: Json
          started_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string
          attempt_index?: number
          completed_at?: string | null
          course_id: string
          days_completed?: number
          days_total?: number
          id?: string
          lessons_completed?: number
          lessons_total?: number
          snapshot?: Json
          started_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string
          attempt_index?: number
          completed_at?: string | null
          course_id?: string
          days_completed?: number
          days_total?: number
          id?: string
          lessons_completed?: number
          lessons_total?: number
          snapshot?: Json
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      day_state: {
        Row: {
          active_lesson_id: string | null
          course_id: string
          created_at: string
          day_id: string
          draft_answers: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_lesson_id?: string | null
          course_id: string
          created_at?: string
          day_id: string
          draft_answers?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_lesson_id?: string | null
          course_id?: string
          created_at?: string
          day_id?: string
          draft_answers?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          granted_at: string
          id: string
          kind: string
          metadata: Json
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          id?: string
          kind: string
          metadata?: Json
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          id?: string
          kind?: string
          metadata?: Json
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intake_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          recommendation: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          recommendation?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          recommendation?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          day_id: string
          id: string
          lesson_id: string
          phase_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          day_id: string
          id?: string
          lesson_id: string
          phase_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          day_id?: string
          id?: string
          lesson_id?: string
          phase_id?: string
          user_id?: string
        }
        Relationships: []
      }
      library_video_tags: {
        Row: {
          tag_id: string
          video_id: string
        }
        Insert: {
          tag_id: string
          video_id: string
        }
        Update: {
          tag_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_video_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_video_tags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      library_videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          level: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          vimeo_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          level?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          vimeo_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          level?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          vimeo_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          channel_email: boolean
          channel_in_app: boolean
          created_at: string
          new_content: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          reminder_days: Json
          reminder_frequency: string
          reminder_time: string
          reminder_times: Json
          reminder_timezone: string
          streak_nudges: boolean
          training_reminders: boolean
          updated_at: string
          user_id: string
          weekly_summary: boolean
        }
        Insert: {
          announcements?: boolean
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          new_content?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_days?: Json
          reminder_frequency?: string
          reminder_time?: string
          reminder_times?: Json
          reminder_timezone?: string
          streak_nudges?: boolean
          training_reminders?: boolean
          updated_at?: string
          user_id: string
          weekly_summary?: boolean
        }
        Update: {
          announcements?: boolean
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          new_content?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reminder_days?: Json
          reminder_frequency?: string
          reminder_time?: string
          reminder_times?: Json
          reminder_timezone?: string
          streak_nudges?: boolean
          training_reminders?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarding_completed_at: string | null
          program_level: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_completed_at?: string | null
          program_level?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          program_level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      program_intake_definitions: {
        Row: {
          completion_copy: string
          created_at: string
          id: string
          introduction: string
          is_published: boolean
          program_id: string
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          completion_copy?: string
          created_at?: string
          id?: string
          introduction?: string
          is_published?: boolean
          program_id: string
          questions?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          completion_copy?: string
          created_at?: string
          id?: string
          introduction?: string
          is_published?: boolean
          program_id?: string
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_intake_definitions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_intake_responses: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          guidance: Json
          id: string
          program_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          guidance?: Json
          id?: string
          program_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          guidance?: Json
          id?: string
          program_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_intake_responses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_lesson_progress: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          lesson_id: string
          program_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id: string
          program_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          lesson_id?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "program_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lesson_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_lessons: {
        Row: {
          created_at: string
          day_number: number | null
          day_type: string
          drip_offset_days: number
          has_readiness_form: boolean
          has_workout_table: boolean
          id: string
          intro: string | null
          section_id: string
          sequence: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number?: number | null
          day_type?: string
          drip_offset_days?: number
          has_readiness_form?: boolean
          has_workout_table?: boolean
          id?: string
          intro?: string | null
          section_id: string
          sequence?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number | null
          day_type?: string
          drip_offset_days?: number
          has_readiness_form?: boolean
          has_workout_table?: boolean
          id?: string
          intro?: string | null
          section_id?: string
          sequence?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "program_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      program_outline: {
        Row: {
          created_at: string
          data: Json
          key: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          data?: Json
          key: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          data?: Json
          key?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      program_sections: {
        Row: {
          created_at: string
          drip_method: string
          drip_offset_days: number
          id: string
          program_id: string
          sequence: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drip_method?: string
          drip_offset_days?: number
          id?: string
          program_id: string
          sequence?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drip_method?: string
          drip_offset_days?: number
          id?: string
          program_id?: string
          sequence?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sections_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_structure: {
        Row: {
          created_at: string
          data: Json
          key: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          data?: Json
          key: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          data?: Json
          key?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      program_sublessons: {
        Row: {
          content: string | null
          created_at: string
          duration_label: string | null
          has_associated_videos: boolean
          has_form: boolean
          has_table: boolean
          id: string
          kind: string
          lesson_id: string
          sequence: number
          title: string
          updated_at: string
          vimeo_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_label?: string | null
          has_associated_videos?: boolean
          has_form?: boolean
          has_table?: boolean
          id?: string
          kind?: string
          lesson_id: string
          sequence?: number
          title: string
          updated_at?: string
          vimeo_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_label?: string | null
          has_associated_videos?: boolean
          has_form?: boolean
          has_table?: boolean
          id?: string
          kind?: string
          lesson_id?: string
          sequence?: number
          title?: string
          updated_at?: string
          vimeo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_sublessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "program_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      program_tags: {
        Row: {
          program_id: string
          tag_id: string
        }
        Insert: {
          program_id: string
          tag_id: string
        }
        Update: {
          program_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_tags_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          access_percent: number
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          ends_on: string | null
          hero_image_url: string | null
          id: string
          included_in_subscription: boolean
          level: string | null
          meta: Json
          name: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_cents: number
          slug: string
          sort_order: number
          starts_on: string | null
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["program_type"]
          updated_at: string
        }
        Insert: {
          access_percent?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          ends_on?: string | null
          hero_image_url?: string | null
          id?: string
          included_in_subscription?: boolean
          level?: string | null
          meta?: Json
          name: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          slug: string
          sort_order?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Update: {
          access_percent?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          ends_on?: string | null
          hero_image_url?: string | null
          id?: string
          included_in_subscription?: boolean
          level?: string | null
          meta?: Json
          name?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          slug?: string
          sort_order?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string | null
          points: number
          stage: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label?: string | null
          points?: number
          stage: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string | null
          points?: number
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_events: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          detail: string | null
          id: string
          kind: string
          opened_at: string | null
          scheduled_for: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          opened_at?: string | null
          scheduled_for?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          opened_at?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      retreat_applications: {
        Row: {
          admin_notes: string | null
          answers: Json
          cohort_ends_on: string | null
          cohort_starts_on: string | null
          created_at: string
          id: string
          retreat_slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          answers?: Json
          cohort_ends_on?: string | null
          cohort_starts_on?: string | null
          created_at?: string
          id?: string
          retreat_slug: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_notes?: string | null
          answers?: Json
          cohort_ends_on?: string | null
          cohort_starts_on?: string | null
          created_at?: string
          id?: string
          retreat_slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retreat_checklist: {
        Row: {
          created_at: string
          done: boolean
          id: string
          item_id: string
          retreat_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          item_id: string
          retreat_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          item_id?: string
          retreat_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retreat_itinerary_items: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          retreat_id: string
          sequence: number
          time_label: string | null
          title: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          retreat_id: string
          sequence?: number
          time_label?: string | null
          title: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          retreat_id?: string
          sequence?: number
          time_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "retreat_itinerary_items_retreat_id_fkey"
            columns: ["retreat_id"]
            isOneToOne: false
            referencedRelation: "retreats"
            referencedColumns: ["id"]
          },
        ]
      }
      retreats: {
        Row: {
          access_percent: number
          capacity: number | null
          created_at: string
          ends_on: string | null
          hero_image_url: string | null
          id: string
          included_in_subscription: boolean
          inclusions: Json
          location: string | null
          name: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_cents: number
          program_id: string | null
          slug: string
          starts_on: string | null
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          access_percent?: number
          capacity?: number | null
          created_at?: string
          ends_on?: string | null
          hero_image_url?: string | null
          id?: string
          included_in_subscription?: boolean
          inclusions?: Json
          location?: string | null
          name: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          program_id?: string | null
          slug: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          access_percent?: number
          capacity?: number | null
          created_at?: string
          ends_on?: string | null
          hero_image_url?: string | null
          id?: string
          included_in_subscription?: boolean
          inclusions?: Json
          location?: string | null
          name?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_cents?: number
          program_id?: string | null
          slug?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retreats_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_videos: {
        Row: {
          created_at: string
          id: string
          slug: string | null
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug?: string | null
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string | null
          title?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      schedule_days: {
        Row: {
          course_id: string
          created_at: string
          day_id: string
          id: string
          phase_id: string
          schedule_id: string
          scheduled_on: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_id: string
          id?: string
          phase_id: string
          schedule_id: string
          scheduled_on: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_id?: string
          id?: string
          phase_id?: string
          schedule_id?: string
          scheduled_on?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_days_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          course_id: string
          created_at: string
          fallback_rule: string
          id: string
          is_active: boolean
          name: string
          reminder_time: string
          reminders_enabled: boolean
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          fallback_rule?: string
          id?: string
          is_active?: boolean
          name?: string
          reminder_time?: string
          reminders_enabled?: boolean
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          fallback_rule?: string
          id?: string
          is_active?: boolean
          name?: string
          reminder_time?: string
          reminders_enabled?: boolean
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      self_guided_plan_sessions: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          lesson_id: string | null
          plan_id: string
          program_id: string | null
          rationale: string
          scheduled_on: string | null
          sequence: number
          source: Json
          status: string
          title: string
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          lesson_id?: string | null
          plan_id: string
          program_id?: string | null
          rationale?: string
          scheduled_on?: string | null
          sequence?: number
          source?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
          week_number?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          lesson_id?: string | null
          plan_id?: string
          program_id?: string | null
          rationale?: string
          scheduled_on?: string | null
          sequence?: number
          source?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "self_guided_plan_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "program_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_guided_plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "self_guided_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "self_guided_plan_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      self_guided_plans: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          name: string
          plan: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          plan?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          name?: string
          plan?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          created_at: string
          id: string
          price_cents: number
          product_id: string
          status: string
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          price_cents?: number
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          price_cents?: number
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sublesson_videos: {
        Row: {
          created_at: string
          id: string
          sequence: number
          sublesson_id: string
          title: string
          vimeo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sequence?: number
          sublesson_id: string
          title: string
          vimeo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sequence?: number
          sublesson_id?: string
          title?: string
          vimeo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sublesson_videos_sublesson_id_fkey"
            columns: ["sublesson_id"]
            isOneToOne: false
            referencedRelation: "program_sublessons"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tool_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          result: Json
          tool_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          result?: Json
          tool_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          result?: Json
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          meta: Json
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          meta?: Json
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_tables: {
        Row: {
          answers: Json
          course_id: string
          created_at: string
          day_id: string
          id: string
          lesson_id: string | null
          phase_id: string
          table_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          course_id: string
          created_at?: string
          day_id: string
          id?: string
          lesson_id?: string | null
          phase_id: string
          table_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          course_id?: string
          created_at?: string
          day_id?: string
          id?: string
          lesson_id?: string | null
          phase_id?: string
          table_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      coaching_mode: "group" | "one_to_one"
      content_status: "draft" | "published" | "archived"
      plan_tier: "free" | "pro" | "max"
      program_type:
        | "live_online"
        | "recorded"
        | "retreat"
        | "coaching"
        | "immersion"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      coaching_mode: ["group", "one_to_one"],
      content_status: ["draft", "published", "archived"],
      plan_tier: ["free", "pro", "max"],
      program_type: [
        "live_online",
        "recorded",
        "retreat",
        "coaching",
        "immersion",
      ],
    },
  },
} as const
