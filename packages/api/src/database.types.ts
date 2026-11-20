// Generated from Supabase project ttkkuqivosiuqkbxmhbq. Regenerate after schema changes.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          note: string | null
          program_id: string
          revoked_at: string | null
          scope: Database["public"]["Enums"]["benefit_scope"]
          source: Database["public"]["Enums"]["grant_source"]
          source_ref: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          note?: string | null
          program_id: string
          revoked_at?: string | null
          scope?: Database["public"]["Enums"]["benefit_scope"]
          source: Database["public"]["Enums"]["grant_source"]
          source_ref?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          note?: string | null
          program_id?: string
          revoked_at?: string | null
          scope?: Database["public"]["Enums"]["benefit_scope"]
          source?: Database["public"]["Enums"]["grant_source"]
          source_ref?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          detail: Json | null
          entity: string | null
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      badges: {
        Row: {
          description: string
          icon: string | null
          id: string
          name: string
          points: number
          position: number
          rule: Json
          tier: string
        }
        Insert: {
          description: string
          icon?: string | null
          id: string
          name: string
          points?: number
          position?: number
          rule: Json
          tier?: string
        }
        Update: {
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points?: number
          position?: number
          rule?: Json
          tier?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          created_at: string
          customer_id: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          provider?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          program_id: string
        }
        Insert: {
          bundle_id: string
          program_id: string
        }
        Update: {
          bundle_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          issued_at: string
          name_on_certificate: string
          path_id: string | null
          program_id: string
          run_number: number
          user_id: string
          verify_code: string
        }
        Insert: {
          id?: string
          issued_at?: string
          name_on_certificate: string
          path_id?: string | null
          program_id: string
          run_number?: number
          user_id: string
          verify_code?: string
        }
        Update: {
          id?: string
          issued_at?: string
          name_on_certificate?: string
          path_id?: string | null
          program_id?: string
          run_number?: number
          user_id?: string
          verify_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_bookings: {
        Row: {
          coach_note: string | null
          created_at: string
          credit_id: string | null
          duration_minutes: number
          id: string
          meeting_url: string | null
          member_note: string | null
          slot_id: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          coach_note?: string | null
          created_at?: string
          credit_id?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          member_note?: string | null
          slot_id?: string | null
          starts_at: string
          status?: string
          user_id: string
        }
        Update: {
          coach_note?: string | null
          created_at?: string
          credit_id?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          member_note?: string | null
          slot_id?: string | null
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_bookings_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "coaching_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "coaching_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_credits: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          package_id: string | null
          source: Database["public"]["Enums"]["grant_source"]
          source_ref: string | null
          total: number
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string | null
          source?: Database["public"]["Enums"]["grant_source"]
          source_ref?: string | null
          total: number
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string | null
          source?: Database["public"]["Enums"]["grant_source"]
          source_ref?: string | null
          total?: number
          used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_credits_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "coaching_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_packages: {
        Row: {
          description: string | null
          duration_minutes: number
          format: string
          id: string
          is_active: boolean
          name: string
          position: number
          program_id: string | null
          requires_application: boolean
          sessions: number
        }
        Insert: {
          description?: string | null
          duration_minutes?: number
          format?: string
          id?: string
          is_active?: boolean
          name: string
          position?: number
          program_id?: string | null
          requires_application?: boolean
          sessions?: number
        }
        Update: {
          description?: string | null
          duration_minutes?: number
          format?: string
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          program_id?: string | null
          requires_application?: boolean
          sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_packages_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_slots: {
        Row: {
          duration_minutes: number
          id: string
          is_open: boolean
          starts_at: string
        }
        Insert: {
          duration_minutes?: number
          id?: string
          is_open?: boolean
          starts_at: string
        }
        Update: {
          duration_minutes?: number
          id?: string
          is_open?: boolean
          starts_at?: string
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string
          position: number
          video_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          video_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          amount_off_cents: number | null
          applies_to: Json
          code: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          percent_off: number | null
          redeemed: number
          stripe_coupon_id: string | null
        }
        Insert: {
          amount_off_cents?: number | null
          applies_to?: Json
          code: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeemed?: number
          stripe_coupon_id?: string | null
        }
        Update: {
          amount_off_cents?: number | null
          applies_to?: Json
          code?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeemed?: number
          stripe_coupon_id?: string | null
        }
        Relationships: []
      }
      day_notes: {
        Row: {
          body: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          id: string
          last_active_at: string
          missed_day_rule: string
          mode: Database["public"]["Enums"]["learning_mode"]
          pace: string
          path_id: string | null
          program_id: string
          recommended_path_id: string | null
          run_number: number
          started_at: string
          training_days: number[]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          last_active_at?: string
          missed_day_rule?: string
          mode?: Database["public"]["Enums"]["learning_mode"]
          pace?: string
          path_id?: string | null
          program_id: string
          recommended_path_id?: string | null
          run_number?: number
          started_at?: string
          training_days?: number[]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          last_active_at?: string
          missed_day_rule?: string
          mode?: Database["public"]["Enums"]["learning_mode"]
          pace?: string
          path_id?: string | null
          program_id?: string
          recommended_path_id?: string | null
          run_number?: number
          started_at?: string
          training_days?: number[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_recommended_path_id_fkey"
            columns: ["recommended_path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      form_bands: {
        Row: {
          band: string
          form_id: string
          id: string
          max_score: number
          message: string
          min_score: number
          name: string
          outcome: Database["public"]["Enums"]["band_outcome"]
          position: number
          table_id: string | null
        }
        Insert: {
          band: string
          form_id: string
          id?: string
          max_score: number
          message?: string
          min_score: number
          name: string
          outcome: Database["public"]["Enums"]["band_outcome"]
          position: number
          table_id?: string | null
        }
        Update: {
          band?: string
          form_id?: string
          id?: string
          max_score?: number
          message?: string
          min_score?: number
          name?: string
          outcome?: Database["public"]["Enums"]["band_outcome"]
          position?: number
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_bands_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_bands_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "workout_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          form_id: string
          key: string
          note: Json | null
          options: Json
          position: number
          prompt: string
        }
        Insert: {
          form_id: string
          key: string
          note?: Json | null
          options: Json
          position: number
          prompt: string
        }
        Update: {
          form_id?: string
          key?: string
          note?: Json | null
          options?: Json
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          default_table_id: string | null
          id: string
          max_score: number
          title: string
          updated_at: string
        }
        Insert: {
          default_table_id?: string | null
          id: string
          max_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          default_table_id?: string | null
          id?: string
          max_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_default_table_id_fkey"
            columns: ["default_table_id"]
            isOneToOne: false
            referencedRelation: "workout_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          approach: string
          created_at: string
          id: string
          kind: string
          program_ids: string[]
          status: string
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          approach?: string
          created_at?: string
          id?: string
          kind: string
          program_ids?: string[]
          status?: string
          target_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          approach?: string
          created_at?: string
          id?: string
          kind?: string
          program_ids?: string[]
          status?: string
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          id: string
          introduction: string | null
          is_published: boolean
          key: string | null
          program_id: string | null
          questions: Json
          result_rules: Json
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          id?: string
          introduction?: string | null
          is_published?: boolean
          key?: string | null
          program_id?: string | null
          questions?: Json
          result_rules?: Json
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          id?: string
          introduction?: string | null
          is_published?: boolean
          key?: string | null
          program_id?: string | null
          questions?: Json
          result_rules?: Json
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "intake_forms_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_responses: {
        Row: {
          answers: Json
          created_at: string
          form_id: string
          id: string
          result: Json
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          form_id: string
          id?: string
          result?: Json
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          day_index: number
          description: string | null
          id: string
          location: string | null
          position: number
          run_id: string
          starts_at: string | null
          title: string
        }
        Insert: {
          day_index?: number
          description?: string | null
          id?: string
          location?: string | null
          position?: number
          run_id: string
          starts_at?: string | null
          title: string
        }
        Update: {
          day_index?: number
          description?: string | null
          id?: string
          location?: string | null
          position?: number
          run_id?: string
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_positions: {
        Row: {
          active_step_id: string | null
          draft_answers: Json | null
          lesson_id: string
          updated_at: string
          user_id: string
          video_seconds: Json
        }
        Insert: {
          active_step_id?: string | null
          draft_answers?: Json | null
          lesson_id: string
          updated_at?: string
          user_id: string
          video_seconds?: Json
        }
        Update: {
          active_step_id?: string | null
          draft_answers?: Json | null
          lesson_id?: string
          updated_at?: string
          user_id?: string
          video_seconds?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lesson_positions_active_step_id_fkey"
            columns: ["active_step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_positions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          day_number: number | null
          day_type: string | null
          estimated_minutes: number | null
          focus: string | null
          form_id: string | null
          id: string
          intro: string | null
          key: string | null
          meta: Json
          page_type: string | null
          path_id: string | null
          position: number
          program_id: string
          section_id: string
          starter_table_id: string | null
          title: string
        }
        Insert: {
          day_number?: number | null
          day_type?: string | null
          estimated_minutes?: number | null
          focus?: string | null
          form_id?: string | null
          id?: string
          intro?: string | null
          key?: string | null
          meta?: Json
          page_type?: string | null
          path_id?: string | null
          position?: number
          program_id: string
          section_id: string
          starter_table_id?: string | null
          title: string
        }
        Update: {
          day_number?: number | null
          day_type?: string | null
          estimated_minutes?: number | null
          focus?: string | null
          form_id?: string | null
          id?: string
          intro?: string | null
          key?: string | null
          meta?: Json
          page_type?: string | null
          path_id?: string | null
          position?: number
          program_id?: string
          section_id?: string
          starter_table_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_starter_table_id_fkey"
            columns: ["starter_table_id"]
            isOneToOne: false
            referencedRelation: "workout_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      member_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      member_plans: {
        Row: {
          created_at: string
          goal_id: string | null
          id: string
          inputs: Json
          name: string
          overview: string | null
          source: string
          starts_on: string
          status: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id?: string | null
          id?: string
          inputs?: Json
          name: string
          overview?: string | null
          source?: string
          starts_on?: string
          status?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string | null
          id?: string
          inputs?: Json
          name?: string
          overview?: string | null
          source?: string
          starts_on?: string
          status?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          audience: Json
          body: string
          ends_at: string | null
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          placement: string
          position: number
          starts_at: string | null
          title: string | null
        }
        Insert: {
          audience?: Json
          body: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          placement: string
          position?: number
          starts_at?: string | null
          title?: string | null
        }
        Update: {
          audience?: Json
          body?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          placement?: string
          position?: number
          starts_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          email_enabled: boolean
          offers_email: boolean
          push_enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          reminder_days: number[]
          reminder_time: string
          streak_nudge: boolean
          updated_at: string
          user_id: string
          weekly_recap: boolean
        }
        Insert: {
          email_enabled?: boolean
          offers_email?: boolean
          push_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          reminder_days?: number[]
          reminder_time?: string
          streak_nudge?: boolean
          updated_at?: string
          user_id: string
          weekly_recap?: boolean
        }
        Update: {
          email_enabled?: boolean
          offers_email?: boolean
          push_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          reminder_days?: number[]
          reminder_time?: string
          streak_nudge?: boolean
          updated_at?: string
          user_id?: string
          weekly_recap?: boolean
        }
        Relationships: []
      }
      offer_events: {
        Row: {
          created_at: string
          event: string
          id: number
          offer_id: string
          placement: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: never
          offer_id: string
          placement: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: never
          offer_id?: string
          placement?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          audience: Json
          body: string | null
          cooldown_days: number
          coupon_id: string | null
          created_at: string
          cta_label: string
          ends_at: string | null
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          max_views: number
          name: string
          placements: string[]
          priority: number
          starts_at: string | null
          target_kind: string
          target_ref: string
          trigger: Json
        }
        Insert: {
          audience?: Json
          body?: string | null
          cooldown_days?: number
          coupon_id?: string | null
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_views?: number
          name: string
          placements?: string[]
          priority?: number
          starts_at?: string | null
          target_kind: string
          target_ref: string
          trigger?: Json
        }
        Update: {
          audience?: Json
          body?: string | null
          cooldown_days?: number
          coupon_id?: string | null
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_views?: number
          name?: string
          placements?: string[]
          priority?: number
          starts_at?: string | null
          target_kind?: string
          target_ref?: string
          trigger?: Json
        }
        Relationships: [
          {
            foreignKeyName: "offers_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          benefit_applied: string | null
          id: string
          kind: string
          name: string
          order_id: string
          price_id: string | null
          quantity: number
          ref_id: string
          unit_cents: number
        }
        Insert: {
          benefit_applied?: string | null
          id?: string
          kind: string
          name: string
          order_id: string
          price_id?: string | null
          quantity?: number
          ref_id: string
          unit_cents: number
        }
        Update: {
          benefit_applied?: string | null
          id?: string
          kind?: string
          name?: string
          order_id?: string
          price_id?: string | null
          quantity?: number
          ref_id?: string
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          currency: string
          discount_cents: number
          id: string
          is_test: boolean
          offer_id: string | null
          org_id: string | null
          provider: string
          provider_ref: string | null
          reference: string
          status: string
          subtotal_cents: number
          total_cents: number
          user_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          is_test?: boolean
          offer_id?: string | null
          org_id?: string | null
          provider?: string
          provider_ref?: string | null
          reference?: string
          status: string
          subtotal_cents?: number
          total_cents?: number
          user_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          id?: string
          is_test?: boolean
          offer_id?: string | null
          org_id?: string | null
          provider?: string
          provider_ref?: string | null
          reference?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_fk"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          coach_id: string | null
          joined_at: string
          org_id: string
          removed_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          coach_id?: string | null
          joined_at?: string
          org_id: string
          removed_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          coach_id?: string | null
          joined_at?: string
          org_id?: string
          removed_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_programs: {
        Row: {
          org_id: string
          program_id: string
        }
        Insert: {
          org_id: string
          program_id: string
        }
        Update: {
          org_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_programs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          grace_until: string | null
          id: string
          is_partner: boolean
          join_domain: string | null
          join_token: string | null
          logo_url: string | null
          name: string
          plan_id: string | null
          revenue_share_percent: number | null
          seats: number
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          grace_until?: string | null
          id?: string
          is_partner?: boolean
          join_domain?: string | null
          join_token?: string | null
          logo_url?: string | null
          name: string
          plan_id?: string | null
          revenue_share_percent?: number | null
          seats?: number
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          grace_until?: string | null
          id?: string
          is_partner?: boolean
          join_domain?: string | null
          join_token?: string | null
          logo_url?: string | null
          name?: string
          plan_id?: string | null
          revenue_share_percent?: number | null
          seats?: number
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id: string
          payload: Json
          processed_at?: string | null
          provider: string
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          type?: string
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          done_at: string | null
          id: string
          kind: string
          lesson_id: string | null
          note: string | null
          on_date: string
          plan_id: string
          position: number
          skipped_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          done_at?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          note?: string | null
          on_date: string
          plan_id: string
          position?: number
          skipped_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          done_at?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          note?: string | null
          on_date?: string
          plan_id?: string
          position?: number
          skipped_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "member_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_program_benefits: {
        Row: {
          benefit: Database["public"]["Enums"]["benefit_type"]
          coaching_credits: number | null
          discount_percent: number | null
          plan_id: string
          program_id: string
          scope: Database["public"]["Enums"]["benefit_scope"]
        }
        Insert: {
          benefit?: Database["public"]["Enums"]["benefit_type"]
          coaching_credits?: number | null
          discount_percent?: number | null
          plan_id: string
          program_id: string
          scope?: Database["public"]["Enums"]["benefit_scope"]
        }
        Update: {
          benefit?: Database["public"]["Enums"]["benefit_type"]
          coaching_credits?: number | null
          discount_percent?: number | null
          plan_id?: string
          program_id?: string
          scope?: Database["public"]["Enums"]["benefit_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_program_benefits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_program_benefits_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          days_per_week: number
          description: string | null
          goal_kind: string
          id: string
          is_published: boolean
          items: Json
          name: string
          position: number
          slug: string
          weeks: number
        }
        Insert: {
          days_per_week: number
          description?: string | null
          goal_kind: string
          id?: string
          is_published?: boolean
          items?: Json
          name: string
          position?: number
          slug: string
          weeks: number
        }
        Update: {
          days_per_week?: number
          description?: string | null
          goal_kind?: string
          id?: string
          is_published?: boolean
          items?: Json
          name?: string
          position?: number
          slug?: string
          weeks?: number
        }
        Relationships: []
      }
      plans: {
        Row: {
          draft_note: string | null
          features: string[]
          id: string
          is_active: boolean
          name: string
          rank: number
          tagline: string | null
        }
        Insert: {
          draft_note?: string | null
          features?: string[]
          id: string
          is_active?: boolean
          name: string
          rank: number
          tagline?: string | null
        }
        Update: {
          draft_note?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          name?: string
          rank?: number
          tagline?: string | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prices: {
        Row: {
          access_days: number | null
          amount_cents: number
          currency: string
          draft_note: string | null
          id: string
          interval: string
          is_active: boolean
          kind: string
          label: string | null
          ref_id: string
          revenuecat_product_id: string | null
          stripe_price_id: string | null
        }
        Insert: {
          access_days?: number | null
          amount_cents: number
          currency?: string
          draft_note?: string | null
          id?: string
          interval?: string
          is_active?: boolean
          kind: string
          label?: string | null
          ref_id: string
          revenuecat_product_id?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          access_days?: number | null
          amount_cents?: number
          currency?: string
          draft_note?: string | null
          id?: string
          interval?: string
          is_active?: boolean
          kind?: string
          label?: string | null
          ref_id?: string
          revenuecat_product_id?: string | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          onboarding: Json
          preferences: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          onboarding?: Json
          preferences?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          onboarding?: Json
          preferences?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_inclusions: {
        Row: {
          access_days: number | null
          included_program_id: string
          parent_program_id: string
        }
        Insert: {
          access_days?: number | null
          included_program_id: string
          parent_program_id: string
        }
        Update: {
          access_days?: number | null
          included_program_id?: string
          parent_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_inclusions_included_program_id_fkey"
            columns: ["included_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_inclusions_parent_program_id_fkey"
            columns: ["parent_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_media: {
        Row: {
          alt: string
          id: string
          position: number
          program_id: string
          role: string
          url: string
        }
        Insert: {
          alt?: string
          id?: string
          position?: number
          program_id: string
          role?: string
          url: string
        }
        Update: {
          alt?: string
          id?: string
          position?: number
          program_id?: string
          role?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_media_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_modes: {
        Row: {
          is_default: boolean
          mode: Database["public"]["Enums"]["learning_mode"]
          program_id: string
          settings: Json
        }
        Insert: {
          is_default?: boolean
          mode: Database["public"]["Enums"]["learning_mode"]
          program_id: string
          settings?: Json
        }
        Update: {
          is_default?: boolean
          mode?: Database["public"]["Enums"]["learning_mode"]
          program_id?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "program_modes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_paths: {
        Row: {
          description: string | null
          id: string
          key: string | null
          kind: string
          meta: Json
          name: string
          position: number
          program_id: string
          short_name: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key?: string | null
          kind?: string
          meta?: Json
          name: string
          position?: number
          program_id: string
          short_name?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string | null
          kind?: string
          meta?: Json
          name?: string
          position?: number
          program_id?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_paths_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_runs: {
        Row: {
          capacity: number | null
          created_at: string
          details: Json
          draft_note: string | null
          ends_at: string | null
          gallery: Json
          id: string
          location: Json
          name: string
          price_note: string | null
          program_id: string
          requires_application: boolean
          starts_at: string
          status: string
          timezone: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          details?: Json
          draft_note?: string | null
          ends_at?: string | null
          gallery?: Json
          id?: string
          location?: Json
          name: string
          price_note?: string | null
          program_id: string
          requires_application?: boolean
          starts_at: string
          status?: string
          timezone?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          details?: Json
          draft_note?: string | null
          ends_at?: string | null
          gallery?: Json
          id?: string
          location?: Json
          name?: string
          price_note?: string | null
          program_id?: string
          requires_application?: boolean
          starts_at?: string
          status?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_runs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
      program_videos: {
        Row: {
          in_library: boolean
          program_id: string
          video_id: string
        }
        Insert: {
          in_library?: boolean
          program_id: string
          video_id: string
        }
        Update: {
          in_library?: boolean
          program_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_videos_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          audience: string | null
          catalog_group: string
          category_id: string | null
          created_at: string
          description: string | null
          draft_note: string | null
          duration_label: string | null
          format_label: string | null
          highlights: string[]
          id: string
          is_free: boolean
          is_listed: boolean
          lesson_label: string
          level: string | null
          meta: Json
          name: string
          position: number
          section_label: string
          sequence_locked: boolean
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          tagline: string | null
          type: Database["public"]["Enums"]["program_type"]
          updated_at: string
        }
        Insert: {
          audience?: string | null
          catalog_group?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          draft_note?: string | null
          duration_label?: string | null
          format_label?: string | null
          highlights?: string[]
          id?: string
          is_free?: boolean
          is_listed?: boolean
          lesson_label?: string
          level?: string | null
          meta?: Json
          name: string
          position?: number
          section_label?: string
          sequence_locked?: boolean
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          tagline?: string | null
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Update: {
          audience?: string | null
          catalog_group?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          draft_note?: string | null
          duration_label?: string | null
          format_label?: string | null
          highlights?: string[]
          id?: string
          is_free?: boolean
          is_listed?: boolean
          lesson_label?: string
          level?: string | null
          meta?: Json
          name?: string
          position?: number
          section_label?: string
          sequence_locked?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          tagline?: string | null
          type?: Database["public"]["Enums"]["program_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      readiness_results: {
        Row: {
          answers: Json
          band: string
          band_name: string
          created_at: string
          form_id: string
          id: string
          lesson_id: string
          outcome: Database["public"]["Enums"]["band_outcome"]
          prescription: Json | null
          score: number
          table_id: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          band: string
          band_name: string
          created_at?: string
          form_id: string
          id?: string
          lesson_id: string
          outcome: Database["public"]["Enums"]["band_outcome"]
          prescription?: Json | null
          score: number
          table_id?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          band?: string
          band_name?: string
          created_at?: string
          form_id?: string
          id?: string
          lesson_id?: string
          outcome?: Database["public"]["Enums"]["band_outcome"]
          prescription?: Json | null
          score?: number
          table_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_results_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_results_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_results_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "workout_tables"
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
      referrals: {
        Row: {
          created_at: string
          id: string
          paid_at: string | null
          referred_id: string
          referrer_id: string
          reward_grant_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid_at?: string | null
          referred_id: string
          referrer_id: string
          reward_grant_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          paid_at?: string | null
          referred_id?: string
          referrer_id?: string
          reward_grant_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_reward_grant_id_fkey"
            columns: ["reward_grant_id"]
            isOneToOne: false
            referencedRelation: "access_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          id: string
          kind: string
          path_id: string | null
          position: number
          program_id: string
          section_id: string | null
          title: string
          url: string
        }
        Insert: {
          id?: string
          kind?: string
          path_id?: string | null
          position?: number
          program_id: string
          section_id?: string | null
          title: string
          url: string
        }
        Update: {
          id?: string
          kind?: string
          path_id?: string | null
          position?: number
          program_id?: string
          section_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      run_applications: {
        Row: {
          admin_note: string | null
          answers: Json
          created_at: string
          id: string
          order_id: string | null
          run_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          answers?: Json
          created_at?: string
          id?: string
          order_id?: string | null
          run_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          answers?: Json
          created_at?: string
          id?: string
          order_id?: string | null
          run_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_applications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_archive: {
        Row: {
          archived_at: string
          completed: boolean
          id: string
          lessons_completed: number
          path_id: string | null
          program_id: string
          run_number: number
          started_at: string | null
          steps_completed: number
          user_id: string
        }
        Insert: {
          archived_at?: string
          completed?: boolean
          id?: string
          lessons_completed?: number
          path_id?: string | null
          program_id: string
          run_number: number
          started_at?: string | null
          steps_completed?: number
          user_id: string
        }
        Update: {
          archived_at?: string
          completed?: boolean
          id?: string
          lessons_completed?: number
          path_id?: string | null
          program_id?: string
          run_number?: number
          started_at?: string | null
          steps_completed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_archive_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_archive_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_checklist: {
        Row: {
          done: boolean
          item_key: string
          run_id: string
          user_id: string
        }
        Insert: {
          done?: boolean
          item_key: string
          run_id: string
          user_id: string
        }
        Update: {
          done?: boolean
          item_key?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_checklist_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_sessions: {
        Row: {
          ends_at: string | null
          id: string
          join_url: string | null
          position: number
          recording_video_id: string | null
          run_id: string
          starts_at: string
          title: string
        }
        Insert: {
          ends_at?: string | null
          id?: string
          join_url?: string | null
          position?: number
          recording_video_id?: string | null
          run_id: string
          starts_at: string
          title: string
        }
        Update: {
          ends_at?: string | null
          id?: string
          join_url?: string | null
          position?: number
          recording_video_id?: string | null
          run_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_sessions_recording_video_id_fkey"
            columns: ["recording_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_sessions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "program_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_videos: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          description: string | null
          id: string
          intro_video_id: string | null
          key: string | null
          label: string | null
          meta: Json
          parent_id: string | null
          path_id: string | null
          position: number
          program_id: string
          release_rule: Json
          subtitle: string | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          intro_video_id?: string | null
          key?: string | null
          label?: string | null
          meta?: Json
          parent_id?: string | null
          path_id?: string | null
          position?: number
          program_id: string
          release_rule?: Json
          subtitle?: string | null
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          intro_video_id?: string | null
          key?: string | null
          label?: string | null
          meta?: Json
          parent_id?: string | null
          path_id?: string | null
          position?: number
          program_id?: string
          release_rule?: Json
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_intro_video_id_fkey"
            columns: ["intro_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      seen_markers: {
        Row: {
          key: string
          seen_at: string
          user_id: string
        }
        Insert: {
          key: string
          seen_at?: string
          user_id: string
        }
        Update: {
          key?: string
          seen_at?: string
          user_id?: string
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
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      step_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          step_id: string
          user_id: string
          via: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          step_id: string
          user_id: string
          via?: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          step_id?: string
          user_id?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      step_videos: {
        Row: {
          id: string
          position: number
          step_id: string
          title: string
          video_id: string
        }
        Insert: {
          id?: string
          position?: number
          step_id: string
          title: string
          video_id: string
        }
        Update: {
          id?: string
          position?: number
          step_id?: string
          title?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_videos_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          attachments: Json
          body: string | null
          description: string | null
          duration_label: string | null
          id: string
          is_required: boolean
          key: string | null
          kind: string | null
          lesson_id: string
          meta: Json
          position: number
          program_id: string
          special: Database["public"]["Enums"]["step_special"]
          title: string
          video_id: string | null
        }
        Insert: {
          attachments?: Json
          body?: string | null
          description?: string | null
          duration_label?: string | null
          id?: string
          is_required?: boolean
          key?: string | null
          kind?: string | null
          lesson_id: string
          meta?: Json
          position?: number
          program_id: string
          special?: Database["public"]["Enums"]["step_special"]
          title: string
          video_id?: string | null
        }
        Update: {
          attachments?: Json
          body?: string | null
          description?: string | null
          duration_label?: string | null
          id?: string
          is_required?: boolean
          key?: string | null
          kind?: string | null
          lesson_id?: string
          meta?: Json
          position?: number
          program_id?: string
          special?: Database["public"]["Enums"]["step_special"]
          title?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          id: string
          interval: string
          org_id: string | null
          plan_id: string
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end: string
          id?: string
          interval?: string
          org_id?: string | null
          plan_id: string
          provider?: string
          provider_ref?: string | null
          status: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          id?: string
          interval?: string
          org_id?: string | null
          plan_id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          namespace: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          namespace?: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          namespace?: string
          slug?: string
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
          answers: Json
          created_at?: string
          id?: string
          result: Json
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
        Relationships: [
          {
            foreignKeyName: "tool_results_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          config: Json
          id: string
          name: string
          position: number
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
        }
        Insert: {
          config?: Json
          id: string
          name: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
        }
        Update: {
          config?: Json
          id?: string
          name?: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          day_completed_at: string | null
          ended_at: string | null
          favourite: boolean
          id: string
          intent: string | null
          last_activity_at: string
          lesson_id: string | null
          minutes: number | null
          notes: string | null
          path_id: string | null
          plan: Json
          planned_minutes: number | null
          program_id: string
          progress: Json
          readiness_result_id: string | null
          repeat_of: string | null
          source: string
          started_at: string
          title: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          day_completed_at?: string | null
          ended_at?: string | null
          favourite?: boolean
          id?: string
          intent?: string | null
          last_activity_at?: string
          lesson_id?: string | null
          minutes?: number | null
          notes?: string | null
          path_id?: string | null
          plan?: Json
          planned_minutes?: number | null
          program_id: string
          progress?: Json
          readiness_result_id?: string | null
          repeat_of?: string | null
          source?: string
          started_at?: string
          title?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          day_completed_at?: string | null
          ended_at?: string | null
          favourite?: boolean
          id?: string
          intent?: string | null
          last_activity_at?: string
          lesson_id?: string | null
          minutes?: number | null
          notes?: string | null
          path_id?: string | null
          plan?: Json
          planned_minutes?: number | null
          program_id?: string
          progress?: Json
          readiness_result_id?: string | null
          repeat_of?: string | null
          source?: string
          started_at?: string
          title?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "program_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_readiness_result_id_fkey"
            columns: ["readiness_result_id"]
            isOneToOne: false
            referencedRelation: "readiness_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_repeat_of_fkey"
            columns: ["repeat_of"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_tags: {
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
            foreignKeyName: "video_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tags_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          level: string | null
          meta: Json
          needs_key: boolean
          privacy_hash: string | null
          provider: string
          provider_id: string
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          level?: string | null
          meta?: Json
          needs_key?: boolean
          privacy_hash?: string | null
          provider?: string
          provider_id: string
          thumbnail_url?: string | null
          title?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          level?: string | null
          meta?: Json
          needs_key?: boolean
          privacy_hash?: string | null
          provider?: string
          provider_id?: string
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      workout_tables: {
        Row: {
          id: string
          images: Json
          notes: string | null
          rows: Json
          title: string
          updated_at: string
        }
        Insert: {
          id: string
          images?: Json
          notes?: string | null
          rows?: Json
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          images?: Json
          notes?: string | null
          rows?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_org_invite: { Args: { p_token: string }; Returns: Json }
      apply_missed_day_rule: {
        Args: { p_plan: string; p_today?: string }
        Returns: Json
      }
      apply_paid_order: {
        Args: { p_order: string; p_payment_ref?: string; p_subscription?: Json }
        Returns: Json
      }
      apply_to_run: { Args: { p_answers?: Json; p_run: string }; Returns: Json }
      book_coaching: {
        Args: { p_note?: string; p_slot: string }
        Returns: Json
      }
      can_access: { Args: { p_program: string }; Returns: boolean }
      cancel_coaching: { Args: { p_booking: string }; Returns: Json }
      claim_referral: { Args: { p_code: string }; Returns: Json }
      complete_step: { Args: { p_step: string; p_via?: string }; Returns: Json }
      create_pending_order: {
        Args: {
          p_coupon?: string
          p_interval?: string
          p_kind: string
          p_offer?: string
          p_ref: string
          p_user: string
        }
        Returns: Json
      }
      curriculum_progress: {
        Args: { p_path?: string; p_program: string }
        Returns: {
          complete: boolean
          done_steps: number
          lesson_id: string
          ord: number
          total_steps: number
          unlocked: boolean
        }[]
      }
      custom_session: {
        Args: { p_program: string; p_steps: string[]; p_title?: string }
        Returns: Json
      }
      end_session: {
        Args: { p_minutes?: number; p_notes?: string; p_session: string }
        Returns: Json
      }
      enroll: {
        Args: {
          p_mode?: Database["public"]["Enums"]["learning_mode"]
          p_path?: string
          p_program: string
        }
        Returns: string
      }
      get_offer: {
        Args: { p_context?: Json; p_placement: string }
        Returns: Json
      }
      join_org: { Args: { p_join_token: string }; Returns: Json }
      lesson_state: { Args: { p_lesson: string }; Returns: Json }
      lesson_unlocked: { Args: { p_lesson: string }; Returns: boolean }
      library_session: { Args: { p_video: string }; Returns: Json }
      library_videos: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_program?: string
          p_query?: string
          p_tags?: string[]
        }
        Returns: {
          category: string
          description: string
          duration_seconds: number
          id: string
          level: string
          privacy_hash: string
          programs: Json
          provider: string
          provider_id: string
          saved: boolean
          tags: Json
          thumbnail_url: string
          title: string
          total_count: number
        }[]
      }
      log_day_completion: {
        Args: { p_lesson: string; p_session?: string }
        Returns: Json
      }
      log_offer_event: {
        Args: { p_event: string; p_offer: string; p_placement: string }
        Returns: undefined
      }
      my_continue: {
        Args: { p_limit?: number; p_program?: string }
        Returns: {
          day_number: number
          day_type: string
          kind: string
          lesson_id: string
          lesson_key: string
          lesson_title: string
          mode: Database["public"]["Enums"]["learning_mode"]
          path_id: string
          path_name: string
          poster: string
          program_id: string
          program_name: string
          program_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          section_title: string
          session_id: string
          session_title: string
          step_count: number
          step_id: string
          step_index: number
          step_title: string
          steps_done: number
          updated_at: string
          video_duration: number
          video_provider_id: string
          video_seconds: number
        }[]
      }
      my_enrollments: {
        Args: never
        Returns: {
          completed_at: string
          current_lesson_id: string
          current_lesson_title: string
          current_section_title: string
          enrollment_id: string
          last_active_at: string
          lessons_done: number
          lessons_total: number
          mode: Database["public"]["Enums"]["learning_mode"]
          pace: string
          path_id: string
          path_name: string
          program_id: string
          program_name: string
          program_slug: string
          program_type: Database["public"]["Enums"]["program_type"]
          run_number: number
          steps_done: number
          steps_total: number
        }[]
      }
      my_experiences: { Args: never; Returns: Json }
      my_referral_code: { Args: never; Returns: string }
      my_rewards: { Args: never; Returns: Json }
      my_training_stats: {
        Args: { p_program?: string; p_weeks?: number }
        Returns: Json
      }
      my_week: {
        Args: { p_from: string; p_to: string }
        Returns: {
          done: boolean
          item_kind: string
          kind: string
          lesson_id: string
          on_date: string
          plan_id: string
          plan_item_id: string
          program_id: string
          program_name: string
          program_slug: string
          ref_id: string
          skipped: boolean
          sort_order: number
          starts_at: string
          subtitle: string
          title: string
        }[]
      }
      org_admin_invite: {
        Args: { p_email: string; p_org: string; p_role?: string }
        Returns: Json
      }
      org_overview: { Args: { p_org: string }; Returns: Json }
      org_remove_member: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      org_set_coach: {
        Args: { p_coach: string; p_member: string; p_org: string }
        Returns: undefined
      }
      program_access_states: {
        Args: never
        Returns: {
          program_id: string
          state: string
        }[]
      }
      quick_session: {
        Args: {
          p_intent?: string
          p_minutes: number
          p_path?: string
          p_program: string
        }
        Returns: Json
      }
      quote: {
        Args: {
          p_coupon?: string
          p_interval?: string
          p_kind: string
          p_ref: string
        }
        Returns: Json
      }
      refund_order: { Args: { p_order: string }; Returns: Json }
      repeat_session: { Args: { p_session: string }; Returns: Json }
      restart_path: {
        Args: { p_path?: string; p_program: string }
        Returns: Json
      }
      save_day_note: {
        Args: { p_body: string; p_lesson: string }
        Returns: string
      }
      save_training_plan: {
        Args: {
          p_inputs: Json
          p_items: Json
          p_name: string
          p_starts_on?: string
        }
        Returns: string
      }
      schedule_immersion: {
        Args: { p_days: number[]; p_enrollment: string; p_starts_on?: string }
        Returns: string
      }
      session_pool: {
        Args: { p_path?: string; p_program: string }
        Returns: {
          lesson_id: string
          lesson_key: string
          lesson_title: string
          minutes: number
          ord: number
          role: string
          step_id: string
          title: string
        }[]
      }
      session_progress: {
        Args: {
          p_done?: boolean
          p_item: string
          p_seconds?: number
          p_session: string
          p_video?: string
        }
        Returns: Json
      }
      set_session_favourite: {
        Args: { p_on: boolean; p_session: string }
        Returns: undefined
      }
      smart_next: {
        Args: { p_path?: string; p_program: string }
        Returns: Json
      }
      start_plan_from_template: {
        Args: { p_days?: number[]; p_starts_on?: string; p_template: string }
        Returns: string
      }
      start_session: {
        Args: { p_lesson: string; p_source?: string }
        Returns: string
      }
      submit_intake: {
        Args: { p_answers: Json; p_form: string }
        Returns: Json
      }
      submit_readiness: {
        Args: { p_answers: Json; p_lesson: string }
        Returns: Json
      }
      training_history: {
        Args: { p_before?: string; p_limit?: number; p_program?: string }
        Returns: {
          day_completed: boolean
          day_number: number
          ended_at: string
          favourite: boolean
          intent: string
          items: number
          items_done: number
          lesson_id: string
          lesson_key: string
          lesson_title: string
          minutes: number
          notes: string
          planned_minutes: number
          program_id: string
          program_name: string
          program_slug: string
          readiness_band: string
          readiness_name: string
          readiness_score: number
          session_id: string
          source: string
          started_at: string
          title: string
        }[]
      }
      uncomplete_step: { Args: { p_step: string }; Returns: undefined }
      verify_certificate: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "coach"
      band_outcome: "workout" | "recovery" | "rest"
      benefit_scope: "content" | "retreat" | "coaching"
      benefit_type: "none" | "discount" | "included"
      content_status: "draft" | "published" | "archived"
      grant_source:
        | "purchase"
        | "subscription"
        | "organization"
        | "inclusion"
        | "migration"
        | "admin"
        | "reward"
      learning_mode: "immersion" | "self_guided" | "library"
      program_type:
        | "course"
        | "day_program"
        | "challenge"
        | "live"
        | "retreat"
        | "coaching"
        | "tool"
        | "bundle"
      step_special: "none" | "readiness" | "workout" | "overview" | "completion"
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
      app_role: ["admin", "coach"],
      band_outcome: ["workout", "recovery", "rest"],
      benefit_scope: ["content", "retreat", "coaching"],
      benefit_type: ["none", "discount", "included"],
      content_status: ["draft", "published", "archived"],
      grant_source: [
        "purchase",
        "subscription",
        "organization",
        "inclusion",
        "migration",
        "admin",
        "reward",
      ],
      learning_mode: ["immersion", "self_guided", "library"],
      program_type: [
        "course",
        "day_program",
        "challenge",
        "live",
        "retreat",
        "coaching",
        "tool",
        "bundle",
      ],
      step_special: ["none", "readiness", "workout", "overview", "completion"],
    },
  },
} as const
