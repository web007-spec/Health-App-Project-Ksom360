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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointment_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_type: string
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          location: string | null
          notes: string | null
          start_time: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          appointment_type_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          badge_type: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          requirement_value: number
        }
        Insert: {
          badge_type: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name: string
          requirement_value: number
        }
        Update: {
          badge_type?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          requirement_value?: number
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          allow_self_booking: boolean
          booking_window_days: number
          buffer_minutes: number
          cancellation_notice_hours: number
          created_at: string
          id: string
          max_daily_appointments: number | null
          min_notice_hours: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          allow_self_booking?: boolean
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_notice_hours?: number
          created_at?: string
          id?: string
          max_daily_appointments?: number | null
          min_notice_hours?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          allow_self_booking?: boolean
          booking_window_days?: number
          buffer_minutes?: number
          cancellation_notice_hours?: number
          created_at?: string
          id?: string
          max_daily_appointments?: number | null
          min_notice_hours?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_settings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      category_workouts: {
        Row: {
          category_id: string
          id: string
          order_index: number
          workout_id: string
        }
        Insert: {
          category_id: string
          id?: string
          order_index: number
          workout_id: string
        }
        Update: {
          category_id?: string
          id?: string
          order_index?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_workouts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "workout_collection_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "ondemand_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_badges: {
        Row: {
          badge_id: string
          client_id: string
          earned_at: string | null
          id: string
          session_id: string | null
        }
        Insert: {
          badge_id: string
          client_id: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
        }
        Update: {
          badge_id?: string
          client_id?: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_badges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_collection_access: {
        Row: {
          client_id: string
          collection_id: string
          granted_at: string
          id: string
        }
        Insert: {
          client_id: string
          collection_id: string
          granted_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          granted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_collection_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_collection_access_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feature_settings: {
        Row: {
          activity_logging_enabled: boolean
          body_metrics_enabled: boolean
          client_id: string
          created_at: string
          food_journal_enabled: boolean
          goals_enabled: boolean
          id: string
          macros_enabled: boolean
          meal_plan_add_recipe_books: boolean
          meal_plan_allow_recipe_replacement: boolean
          meal_plan_header_label: string
          meal_plan_type: string
          messages_enabled: boolean
          progress_photos_enabled: boolean
          tasks_enabled: boolean
          trainer_id: string
          training_enabled: boolean
          updated_at: string
          workout_comments_enabled: boolean
        }
        Insert: {
          activity_logging_enabled?: boolean
          body_metrics_enabled?: boolean
          client_id: string
          created_at?: string
          food_journal_enabled?: boolean
          goals_enabled?: boolean
          id?: string
          macros_enabled?: boolean
          meal_plan_add_recipe_books?: boolean
          meal_plan_allow_recipe_replacement?: boolean
          meal_plan_header_label?: string
          meal_plan_type?: string
          messages_enabled?: boolean
          progress_photos_enabled?: boolean
          tasks_enabled?: boolean
          trainer_id: string
          training_enabled?: boolean
          updated_at?: string
          workout_comments_enabled?: boolean
        }
        Update: {
          activity_logging_enabled?: boolean
          body_metrics_enabled?: boolean
          client_id?: string
          created_at?: string
          food_journal_enabled?: boolean
          goals_enabled?: boolean
          id?: string
          macros_enabled?: boolean
          meal_plan_add_recipe_books?: boolean
          meal_plan_allow_recipe_replacement?: boolean
          meal_plan_header_label?: string
          meal_plan_type?: string
          messages_enabled?: boolean
          progress_photos_enabled?: boolean
          tasks_enabled?: boolean
          trainer_id?: string
          training_enabled?: boolean
          updated_at?: string
          workout_comments_enabled?: boolean
        }
        Relationships: []
      }
      client_goal_countdowns: {
        Row: {
          background_color: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          icon: string | null
          id: string
          is_completed: boolean | null
          notify_day_before: boolean | null
          notify_on_end: boolean | null
          notify_week_before: boolean | null
          title: string
          trainer_id: string
          type: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          notify_day_before?: boolean | null
          notify_on_end?: boolean | null
          notify_week_before?: boolean | null
          title: string
          trainer_id: string
          type: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          notify_day_before?: boolean | null
          notify_on_end?: boolean | null
          notify_week_before?: boolean | null
          title?: string
          trainer_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_habits: {
        Row: {
          client_id: string
          comments_enabled: boolean | null
          created_at: string
          description: string | null
          end_date: string | null
          frequency: string
          goal_unit: string
          goal_value: number
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          reminder_enabled: boolean | null
          reminder_time: string | null
          start_date: string
          template_id: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          comments_enabled?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          goal_unit?: string
          goal_value?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          start_date?: string
          template_id?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          comments_enabled?: boolean | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: string
          goal_unit?: string
          goal_value?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          start_date?: string
          template_id?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_habits_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ical_feeds: {
        Row: {
          client_id: string
          created_at: string
          feed_name: string
          feed_url: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          sync_error: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          feed_name?: string
          feed_url: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          feed_name?: string
          feed_url?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_macro_targets: {
        Row: {
          client_id: string
          created_at: string
          diet_style: string | null
          id: string
          is_active: boolean | null
          rest_day_calories: number | null
          rest_day_carbs: number | null
          rest_day_fats: number | null
          rest_day_protein: number | null
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_protein: number | null
          tracking_option: string
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          diet_style?: string | null
          id?: string
          is_active?: boolean | null
          rest_day_calories?: number | null
          rest_day_carbs?: number | null
          rest_day_fats?: number | null
          rest_day_protein?: number | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          tracking_option?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          diet_style?: string | null
          id?: string
          is_active?: boolean | null
          rest_day_calories?: number | null
          rest_day_carbs?: number | null
          rest_day_fats?: number | null
          rest_day_protein?: number | null
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          tracking_option?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_meal_plan_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          end_date: string | null
          id: string
          meal_plan_id: string | null
          notes: string | null
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          start_date: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          end_date?: string | null
          id?: string
          meal_plan_id?: string | null
          notes?: string | null
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          start_date: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          end_date?: string | null
          id?: string
          meal_plan_id?: string | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["meal_plan_type"]
          start_date?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_plan_assignments_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meal_selections: {
        Row: {
          assignment_id: string | null
          client_id: string
          created_at: string
          id: string
          meal_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
          servings: number | null
        }
        Insert: {
          assignment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          meal_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          recipe_id: string
          servings?: number | null
        }
        Update: {
          assignment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          recipe_id?: string
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_meal_selections_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "client_meal_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meal_selections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_metrics: {
        Row: {
          client_id: string
          created_at: string
          goal_value: number | null
          id: string
          is_pinned: boolean
          metric_definition_id: string
          order_index: number
          starting_value: number | null
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          goal_value?: number | null
          id?: string
          is_pinned?: boolean
          metric_definition_id: string
          order_index?: number
          starting_value?: number | null
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          goal_value?: number | null
          id?: string
          is_pinned?: boolean
          metric_definition_id?: string
          order_index?: number
          starting_value?: number | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_metric_definition_id_fkey"
            columns: ["metric_definition_id"]
            isOneToOne: false
            referencedRelation: "metric_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_metrics_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_recipe_book_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          recipe_book_id: string
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          recipe_book_id: string
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          recipe_book_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recipe_book_assignments_recipe_book_id_fkey"
            columns: ["recipe_book_id"]
            isOneToOne: false
            referencedRelation: "recipe_books"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recipe_collections: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_rest_day_cards: {
        Row: {
          client_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_saved_recipes: {
        Row: {
          client_id: string
          collection_id: string | null
          id: string
          recipe_id: string
          saved_at: string
        }
        Insert: {
          client_id: string
          collection_id?: string | null
          id?: string
          recipe_id: string
          saved_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string | null
          id?: string
          recipe_id?: string
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_saved_recipes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "client_recipe_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_saved_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sport_day_cards: {
        Row: {
          card_type: string
          client_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          card_type: string
          client_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          card_type?: string
          client_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_sport_profiles: {
        Row: {
          bats: string | null
          client_id: string
          created_at: string
          id: string
          jersey_number: string | null
          position: string | null
          sport: string
          team_name: string | null
          throws: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          bats?: string | null
          client_id: string
          created_at?: string
          id?: string
          jersey_number?: string | null
          position?: string | null
          sport?: string
          team_name?: string | null
          throws?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          bats?: string | null
          client_id?: string
          created_at?: string
          id?: string
          jersey_number?: string | null
          position?: string | null
          sport?: string
          team_name?: string | null
          throws?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_studio_program_access: {
        Row: {
          client_id: string
          current_week: number | null
          granted_at: string
          id: string
          program_id: string
          started_at: string | null
        }
        Insert: {
          client_id: string
          current_week?: number | null
          granted_at?: string
          id?: string
          program_id: string
          started_at?: string | null
        }
        Update: {
          client_id?: string
          current_week?: number | null
          granted_at?: string
          id?: string
          program_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_studio_program_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_studio_program_access_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "studio_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_at: string
          attachments: Json | null
          client_id: string
          completed_at: string | null
          description: string | null
          due_date: string | null
          form_responses: Json | null
          id: string
          name: string
          notes: string | null
          reminder_enabled: boolean | null
          reminder_hours_before: number | null
          task_type: Database["public"]["Enums"]["task_type"]
          template_id: string | null
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          attachments?: Json | null
          client_id: string
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          form_responses?: Json | null
          id?: string
          name: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          attachments?: Json | null
          client_id?: string
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          form_responses?: Json | null
          id?: string
          name?: string
          notes?: string | null
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template_id?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workout_collection_access: {
        Row: {
          client_id: string
          collection_id: string
          granted_at: string
          id: string
        }
        Insert: {
          client_id: string
          collection_id: string
          granted_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          granted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_workout_collection_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workout_collection_access_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "workout_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workouts: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string
          completed_at: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          workout_plan_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          workout_plan_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          completed_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_workouts_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_sections: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          layout_type: Database["public"]["Enums"]["layout_type"] | null
          name: string
          order_index: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          layout_type?: Database["public"]["Enums"]["layout_type"] | null
          name: string
          order_index: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          layout_type?: Database["public"]["Enums"]["layout_type"] | null
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_sections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "resource_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_read_receipts: {
        Row: {
          conversation_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_read_receipts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_alternatives: {
        Row: {
          alternative_exercise_id: string
          created_at: string | null
          exercise_id: string
          id: string
          reason: string | null
          trainer_id: string
        }
        Insert: {
          alternative_exercise_id: string
          created_at?: string | null
          exercise_id: string
          id?: string
          reason?: string | null
          trainer_id: string
        }
        Update: {
          alternative_exercise_id?: string
          created_at?: string | null
          exercise_id?: string
          id?: string
          reason?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_alternatives_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternatives_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_custom_options: {
        Row: {
          created_at: string
          id: string
          name: string
          option_type: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          option_type: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          option_type?: string
          trainer_id?: string
        }
        Relationships: []
      }
      exercise_exercise_tags: {
        Row: {
          exercise_id: string
          tag_id: string
        }
        Insert: {
          exercise_id: string
          tag_id: string
        }
        Update: {
          exercise_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_exercise_tags_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_exercise_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "exercise_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tags: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tags_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          equipment: string | null
          id: string
          image_url: string | null
          muscle_group: string | null
          name: string
          trainer_id: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name: string
          trainer_id: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name?: string
          trainer_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_goals: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          start_date: string
          status: string
          target_date: string
          target_value: number | null
          title: string
          trainer_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          start_date?: string
          status?: string
          target_date: string
          target_value?: number | null
          title: string
          trainer_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_date?: string
          target_value?: number | null
          title?: string
          trainer_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_stat_entries: {
        Row: {
          assists: number | null
          at_bats: number | null
          blocks: number | null
          client_id: string
          created_at: string
          doubles: number | null
          earned_runs: number | null
          errors: number | null
          fg_attempted: number | null
          fg_made: number | null
          fouls: number | null
          ft_attempted: number | null
          ft_made: number | null
          game_date: string
          hits: number | null
          home_runs: number | null
          id: string
          innings_pitched: number | null
          minutes_played: number | null
          notes: string | null
          opponent: string | null
          pitch_strikeouts: number | null
          points: number | null
          rbis: number | null
          rebounds: number | null
          result: string | null
          runs: number | null
          singles: number | null
          sport: string
          sport_event_id: string | null
          steals: number | null
          stolen_bases: number | null
          strikeouts: number | null
          three_pt_attempted: number | null
          three_pt_made: number | null
          triples: number | null
          turnovers: number | null
          updated_at: string
          walks: number | null
        }
        Insert: {
          assists?: number | null
          at_bats?: number | null
          blocks?: number | null
          client_id: string
          created_at?: string
          doubles?: number | null
          earned_runs?: number | null
          errors?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string
          hits?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          pitch_strikeouts?: number | null
          points?: number | null
          rbis?: number | null
          rebounds?: number | null
          result?: string | null
          runs?: number | null
          singles?: number | null
          sport?: string
          sport_event_id?: string | null
          steals?: number | null
          stolen_bases?: number | null
          strikeouts?: number | null
          three_pt_attempted?: number | null
          three_pt_made?: number | null
          triples?: number | null
          turnovers?: number | null
          updated_at?: string
          walks?: number | null
        }
        Update: {
          assists?: number | null
          at_bats?: number | null
          blocks?: number | null
          client_id?: string
          created_at?: string
          doubles?: number | null
          earned_runs?: number | null
          errors?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string
          hits?: number | null
          home_runs?: number | null
          id?: string
          innings_pitched?: number | null
          minutes_played?: number | null
          notes?: string | null
          opponent?: string | null
          pitch_strikeouts?: number | null
          points?: number | null
          rbis?: number | null
          rebounds?: number | null
          result?: string | null
          runs?: number | null
          singles?: number | null
          sport?: string
          sport_event_id?: string | null
          steals?: number | null
          stolen_bases?: number | null
          strikeouts?: number | null
          three_pt_attempted?: number | null
          three_pt_made?: number | null
          triples?: number | null
          turnovers?: number | null
          updated_at?: string
          walks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_stat_entries_sport_event_id_fkey"
            columns: ["sport_event_id"]
            isOneToOne: false
            referencedRelation: "sport_schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          goal_id: string
          id: string
          target_value: number
          title: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          target_value: number
          title: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fitness_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          connected_at: string
          id: string
          refresh_token: string | null
          sync_from_google: boolean
          sync_to_google: boolean
          token_expires_at: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          refresh_token?: string | null
          sync_from_google?: boolean
          sync_to_google?: boolean
          token_expires_at?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          connected_at?: string
          id?: string
          refresh_token?: string | null
          sync_from_google?: boolean
          sync_to_google?: boolean
          token_expires_at?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_comments: {
        Row: {
          content: string | null
          created_at: string
          habit_id: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          habit_id: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          habit_id?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_comments_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "client_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          client_id: string
          completed_at: string
          completion_date: string
          habit_id: string
          id: string
          notes: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string
          completion_date: string
          habit_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string
          completion_date?: string
          habit_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "client_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      health_connections: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          permissions: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          permissions?: Json | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          permissions?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_data: {
        Row: {
          client_id: string
          created_at: string | null
          data_type: string
          id: string
          metadata: Json | null
          recorded_at: string
          source: string
          synced_at: string | null
          unit: string | null
          value: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_type: string
          id?: string
          metadata?: Json | null
          recorded_at: string
          source: string
          synced_at?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_type?: string
          id?: string
          metadata?: Json | null
          recorded_at?: string
          source?: string
          synced_at?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_notifications: {
        Row: {
          client_id: string
          created_at: string
          id: string
          message: string
          notification_type: string
          read_at: string | null
          sent_at: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          sent_at?: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          sent_at?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_notifications_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_categories: {
        Row: {
          id: string
          meal_plan_id: string
          name: string
          order_index: number
        }
        Insert: {
          id?: string
          meal_plan_id: string
          name: string
          order_index?: number
        }
        Update: {
          id?: string
          meal_plan_id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_categories_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_days: {
        Row: {
          day_of_week: number
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes: string | null
          order_index: number | null
          plan_date: string
          recipe_id: string
          servings: number | null
          week_number: number
        }
        Insert: {
          day_of_week?: number
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          order_index?: number | null
          plan_date: string
          recipe_id: string
          servings?: number | null
          week_number?: number
        }
        Update: {
          day_of_week?: number
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          notes?: string | null
          order_index?: number | null
          plan_date?: string
          recipe_id?: string
          servings?: number | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_days_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_days_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_flexible_options: {
        Row: {
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          order_index: number | null
          recipe_id: string
          week_number: number
        }
        Insert: {
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          order_index?: number | null
          recipe_id: string
          week_number?: number
        }
        Update: {
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          order_index?: number | null
          recipe_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_flexible_options_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_flexible_options_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_notes: {
        Row: {
          content: string
          created_at: string
          day_of_week: number | null
          id: string
          meal_plan_id: string
          note_type: string
          updated_at: string
          week_number: number
        }
        Insert: {
          content?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_plan_id: string
          note_type: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_plan_id?: string
          note_type?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_notes_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          num_weeks: number
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          status: string
          target_calories: number | null
          target_carbs: number | null
          target_fats: number | null
          target_protein: number | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          num_weeks?: number
          plan_type: Database["public"]["Enums"]["meal_plan_type"]
          status?: string
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          num_weeks?: number
          plan_type?: Database["public"]["Enums"]["meal_plan_type"]
          status?: string
          target_calories?: number | null
          target_carbs?: number | null
          target_fats?: number | null
          target_protein?: number | null
          trainer_id?: string
          updated_at?: string
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
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          category: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          trainer_id: string | null
          unit: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          trainer_id?: string | null
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          trainer_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_definitions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_entries: {
        Row: {
          client_id: string
          client_metric_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_at: string
          value: number
        }
        Insert: {
          client_id: string
          client_metric_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value: number
        }
        Update: {
          client_id?: string
          client_metric_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_entries_client_metric_id_fkey"
            columns: ["client_metric_id"]
            isOneToOne: false
            referencedRelation: "client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          activity_threshold_calories: number | null
          activity_threshold_steps: number | null
          created_at: string | null
          email_enabled: boolean | null
          health_sync_alerts: boolean | null
          id: string
          low_activity_alerts: boolean | null
          push_enabled: boolean | null
          push_subscription: Json | null
          reminder_hours_before: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_threshold_calories?: number | null
          activity_threshold_steps?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          health_sync_alerts?: boolean | null
          id?: string
          low_activity_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          reminder_hours_before?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_threshold_calories?: number | null
          activity_threshold_steps?: number | null
          created_at?: string | null
          email_enabled?: boolean | null
          health_sync_alerts?: boolean | null
          id?: string
          low_activity_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          reminder_hours_before?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs: number | null
          client_id: string
          created_at: string
          fats: number | null
          id: string
          image_url: string | null
          log_date: string
          meal_name: string
          notes: string | null
          protein: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          client_id: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          log_date?: string
          meal_name: string
          notes?: string | null
          protein?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          client_id?: string
          created_at?: string
          fats?: number | null
          id?: string
          image_url?: string | null
          log_date?: string
          meal_name?: string
          notes?: string | null
          protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ondemand_workouts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          thumbnail_url: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at: string
          video_url: string | null
          workout_plan_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          thumbnail_url?: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at?: string
          video_url?: string | null
          workout_plan_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          thumbnail_url?: string | null
          trainer_id?: string
          type?: Database["public"]["Enums"]["ondemand_workout_type"]
          updated_at?: string
          video_url?: string | null
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ondemand_workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ondemand_workouts_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          days_per_week: number
          description: string | null
          duration_weeks: number
          id: string
          name: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number
          description?: string | null
          duration_weeks?: number
          id?: string
          name: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          description?: string | null
          duration_weeks?: number
          id?: string
          name?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          body_fat_percentage: number | null
          client_id: string
          created_at: string
          entry_date: string
          id: string
          measurements: Json | null
          notes: string | null
          photos: Json | null
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          client_id: string
          created_at?: string
          entry_date?: string
          id?: string
          measurements?: Json | null
          notes?: string | null
          photos?: Json | null
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          client_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          measurements?: Json | null
          notes?: string | null
          photos?: Json | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_book_recipes: {
        Row: {
          id: string
          order_index: number
          recipe_book_id: string
          recipe_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          recipe_book_id: string
          recipe_id: string
        }
        Update: {
          id?: string
          order_index?: number
          recipe_book_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_book_recipes_recipe_book_id_fkey"
            columns: ["recipe_book_id"]
            isOneToOne: false
            referencedRelation: "recipe_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_book_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_books: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          amount: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          recipe_id: string
          unit: string | null
        }
        Insert: {
          amount?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          recipe_id: string
          unit?: string | null
        }
        Update: {
          amount?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          fats: number | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          prep_time_minutes: number | null
          protein: number | null
          servings: number | null
          tags: string[] | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          fats?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          prep_time_minutes?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          fats?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          prep_time_minutes?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_collections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          cover_image_url: string | null
          created_at: string
          file_path: string | null
          id: string
          name: string
          trainer_id: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          name: string
          trainer_id: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          name?: string
          trainer_id?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      section_resources: {
        Row: {
          id: string
          order_index: number
          resource_id: string
          section_id: string
        }
        Insert: {
          id?: string
          order_index: number
          resource_id: string
          section_id: string
        }
        Update: {
          id?: string
          order_index?: number
          resource_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "collection_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_event_completions: {
        Row: {
          client_id: string
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          sport_event_id: string
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          sport_event_id: string
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          sport_event_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_event_completions_sport_event_id_fkey"
            columns: ["sport_event_id"]
            isOneToOne: false
            referencedRelation: "sport_schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_schedule_events: {
        Row: {
          all_day: boolean
          client_id: string
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string
          event_uid: string
          feed_id: string
          id: string
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          client_id: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          event_uid: string
          feed_id: string
          id?: string
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          client_id?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          event_uid?: string
          feed_id?: string
          id?: string
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sport_schedule_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "client_ical_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_programs: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_weeks: number
          id: string
          is_published: boolean | null
          name: string
          status: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_published?: boolean | null
          name: string
          status?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_weeks?: number
          id?: string
          is_published?: boolean | null
          name?: string
          status?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string | null
          form_questions: Json | null
          frequency: string | null
          goal_unit: string | null
          goal_value: number | null
          icon_url: string | null
          id: string
          is_shared: boolean | null
          name: string
          reminder_enabled: boolean | null
          reminder_hours_before: number | null
          task_type: Database["public"]["Enums"]["task_type"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          form_questions?: Json | null
          frequency?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          icon_url?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          form_questions?: Json | null
          frequency?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          icon_url?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          reminder_enabled?: boolean | null
          reminder_hours_before?: number | null
          task_type?: Database["public"]["Enums"]["task_type"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainer_availability: {
        Row: {
          appointment_type_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          is_general: boolean
          location: string | null
          start_time: string
          trainer_id: string
        }
        Insert: {
          appointment_type_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          is_general?: boolean
          location?: string | null
          start_time: string
          trainer_id: string
        }
        Update: {
          appointment_type_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          is_general?: boolean
          location?: string | null
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_availability_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          status: Database["public"]["Enums"]["client_status"]
          trainer_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_date_overrides: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_unavailable: boolean
          notes: string | null
          override_date: string
          start_time: string | null
          trainer_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          notes?: string | null
          override_date: string
          start_time?: string | null
          trainer_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          notes?: string | null
          override_date?: string
          start_time?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_date_overrides_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_vacations: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_vacations_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_collection_categories: {
        Row: {
          collection_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
        }
        Insert: {
          collection_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index: number
        }
        Update: {
          collection_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_collection_categories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "workout_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_collections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          reps: number | null
          session_id: string
          set_number: number
          weight: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          reps?: number | null
          session_id: string
          set_number: number
          weight?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          reps?: number | null
          session_id?: string
          set_number?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_labels: {
        Row: {
          category: Database["public"]["Enums"]["label_category"]
          created_at: string
          id: string
          is_default: boolean | null
          trainer_id: string | null
          value: string
        }
        Insert: {
          category: Database["public"]["Enums"]["label_category"]
          created_at?: string
          id?: string
          is_default?: boolean | null
          trainer_id?: string | null
          value: string
        }
        Update: {
          category?: Database["public"]["Enums"]["label_category"]
          created_at?: string
          id?: string
          is_default?: boolean | null
          trainer_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_labels_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_exercises: {
        Row: {
          duration_seconds: number | null
          exercise_id: string
          exercise_type: string | null
          id: string
          notes: string | null
          order_index: number
          reps: number | null
          rest_seconds: number | null
          section_id: string | null
          sets: number | null
          tempo: string | null
          workout_plan_id: string
        }
        Insert: {
          duration_seconds?: number | null
          exercise_id: string
          exercise_type?: string | null
          id?: string
          notes?: string | null
          order_index: number
          reps?: number | null
          rest_seconds?: number | null
          section_id?: string | null
          sets?: number | null
          tempo?: string | null
          workout_plan_id: string
        }
        Update: {
          duration_seconds?: number | null
          exercise_id?: string
          exercise_type?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          rest_seconds?: number | null
          section_id?: string | null
          sets?: number | null
          tempo?: string | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workout_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes: number
          id: string
          image_url: string | null
          is_template: boolean | null
          name: string
          template_category: string | null
          trainer_id: string
          updated_at: string
          use_count: number | null
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_template?: boolean | null
          name: string
          template_category?: string | null
          trainer_id: string
          updated_at?: string
          use_count?: number | null
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["workout_difficulty"]
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_template?: boolean | null
          name?: string
          template_category?: string | null
          trainer_id?: string
          updated_at?: string
          use_count?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          rest_between_rounds_seconds: number | null
          rest_seconds: number | null
          rounds: number | null
          section_type: string
          work_seconds: number | null
          workout_plan_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index: number
          rest_between_rounds_seconds?: number | null
          rest_seconds?: number | null
          rounds?: number | null
          section_type?: string
          work_seconds?: number | null
          workout_plan_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          rest_between_rounds_seconds?: number | null
          rest_seconds?: number | null
          rounds?: number | null
          section_type?: string
          work_seconds?: number | null
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sections_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          client_workout_id: string
          completed_at: string | null
          created_at: string | null
          difficulty_rating: number | null
          duration_seconds: number | null
          id: string
          is_partial: boolean | null
          notes: string | null
          started_at: string
          workout_plan_id: string
        }
        Insert: {
          client_id: string
          client_workout_id: string
          completed_at?: string | null
          created_at?: string | null
          difficulty_rating?: number | null
          duration_seconds?: number | null
          id?: string
          is_partial?: boolean | null
          notes?: string | null
          started_at: string
          workout_plan_id: string
        }
        Update: {
          client_id?: string
          client_workout_id?: string
          completed_at?: string | null
          created_at?: string | null
          difficulty_rating?: number | null
          duration_seconds?: number | null
          id?: string
          is_partial?: boolean | null
          notes?: string | null
          started_at?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_client_workout_id_fkey"
            columns: ["client_workout_id"]
            isOneToOne: false
            referencedRelation: "client_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_workout_labels: {
        Row: {
          label_id: string
          workout_id: string
        }
        Insert: {
          label_id: string
          workout_id: string
        }
        Update: {
          label_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_workout_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "workout_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_workout_labels_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "ondemand_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      client_status: "active" | "paused" | "pending"
      label_category:
        | "level"
        | "duration"
        | "intensity"
        | "type"
        | "body_part"
        | "location"
      layout_type: "large_cards" | "narrow_cards" | "small_cards" | "list"
      meal_plan_type: "flexible" | "structured" | "recipe_books_only"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      ondemand_workout_type: "regular" | "video"
      resource_type: "link" | "document" | "form"
      task_type:
        | "general"
        | "progress_photo"
        | "body_metrics"
        | "form"
        | "habit"
      user_role: "trainer" | "client"
      workout_difficulty: "beginner" | "intermediate" | "advanced"
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
      client_status: ["active", "paused", "pending"],
      label_category: [
        "level",
        "duration",
        "intensity",
        "type",
        "body_part",
        "location",
      ],
      layout_type: ["large_cards", "narrow_cards", "small_cards", "list"],
      meal_plan_type: ["flexible", "structured", "recipe_books_only"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      ondemand_workout_type: ["regular", "video"],
      resource_type: ["link", "document", "form"],
      task_type: ["general", "progress_photo", "body_metrics", "form", "habit"],
      user_role: ["trainer", "client"],
      workout_difficulty: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
