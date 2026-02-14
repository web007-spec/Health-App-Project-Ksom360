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
      client_tasks: {
        Row: {
          assigned_at: string
          attachments: Json | null
          client_id: string
          completed_at: string | null
          description: string | null
          due_date: string | null
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
      task_templates: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string | null
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
