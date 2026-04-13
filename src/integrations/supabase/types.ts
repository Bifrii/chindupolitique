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
      api_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      archives: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          source_module: string
          summary: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          source_module?: string
          summary?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          source_module?: string
          summary?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string
          region: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          region?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          region?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts_planifies: {
        Row: {
          ai_optimized_content: Json | null
          ai_score: number | null
          category: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          platforms: string[]
          scheduled_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_optimized_content?: Json | null
          ai_score?: number | null
          category?: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          platforms?: string[]
          scheduled_at: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_optimized_content?: Json | null
          ai_score?: number | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          platforms?: string[]
          scheduled_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          objectifs: string[] | null
          onboarding_completed: boolean | null
          political_role: string | null
          rayonnement: string | null
          region: string | null
          territoire: string | null
          twitter_handle: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          objectifs?: string[] | null
          onboarding_completed?: boolean | null
          political_role?: string | null
          rayonnement?: string | null
          region?: string | null
          territoire?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          objectifs?: string[] | null
          onboarding_completed?: boolean | null
          political_role?: string | null
          rayonnement?: string | null
          region?: string | null
          territoire?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      twitter_oauth_states: {
        Row: {
          code_verifier: string
          created_at: string | null
          id: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string | null
          id?: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string | null
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      twitter_tokens: {
        Row: {
          access_token: string
          connected_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          twitter_user_id: string | null
          twitter_username: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
      veille_alertes: {
        Row: {
          created_at: string | null
          id: string
          message: string
          seen: boolean
          severity: string
          trend_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          seen?: boolean
          severity?: string
          trend_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          seen?: boolean
          severity?: string
          trend_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      veille_cache: {
        Row: {
          analyse_globale: string | null
          fetched_at: string | null
          id: string
          tension_level: number | null
          trends_data: Json
          user_id: string
        }
        Insert: {
          analyse_globale?: string | null
          fetched_at?: string | null
          id?: string
          tension_level?: number | null
          trends_data?: Json
          user_id: string
        }
        Update: {
          analyse_globale?: string | null
          fetched_at?: string | null
          id?: string
          tension_level?: number | null
          trends_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      veille_repliques: {
        Row: {
          created_at: string | null
          hashtags: string[] | null
          id: string
          position: string
          post_text: string
          tone: string
          trend_title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          position: string
          post_text: string
          tone: string
          trend_title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          position?: string
          post_text?: string
          tone?: string
          trend_title?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
