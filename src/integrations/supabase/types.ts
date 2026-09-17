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
      ai_usage_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          used_credit: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          used_credit?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          used_credit?: boolean
          user_id?: string
        }
        Relationships: []
      }
      avatar_credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clothing_items: {
        Row: {
          availability: string
          category: string
          color: string | null
          created_at: string
          id: string
          image_url: string
          is_favorite: boolean
          name: string
          subcategory: string | null
          user_id: string
        }
        Insert: {
          availability?: string
          category: string
          color?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_favorite?: boolean
          name: string
          subcategory?: string | null
          user_id: string
        }
        Update: {
          availability?: string
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_favorite?: boolean
          name?: string
          subcategory?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_locks: {
        Row: {
          locked_until: string
          name: string
          updated_at: string
        }
        Insert: {
          locked_until?: string
          name: string
          updated_at?: string
        }
        Update: {
          locked_until?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      outfit_history: {
        Row: {
          created_at: string
          event: string
          feedback: string | null
          formality: string | null
          id: string
          is_favorite: boolean
          is_night: boolean | null
          mood: string | null
          rain_probability: number | null
          recommendation: string
          recommended_item_ids: string[] | null
          season: string
          temperature: number
          user_id: string
          weather: string
          wind_kmh: number | null
        }
        Insert: {
          created_at?: string
          event: string
          feedback?: string | null
          formality?: string | null
          id?: string
          is_favorite?: boolean
          is_night?: boolean | null
          mood?: string | null
          rain_probability?: number | null
          recommendation: string
          recommended_item_ids?: string[] | null
          season: string
          temperature: number
          user_id: string
          weather: string
          wind_kmh?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          feedback?: string | null
          formality?: string | null
          id?: string
          is_favorite?: boolean
          is_night?: boolean | null
          mood?: string | null
          rain_probability?: number | null
          recommendation?: string
          recommended_item_ids?: string[] | null
          season?: string
          temperature?: number
          user_id?: string
          weather?: string
          wind_kmh?: number | null
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          product: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          product?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          product?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_looks: {
        Row: {
          created_at: string
          id: string
          image_url: string
          item_ids: string[]
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          item_ids?: string[]
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          item_ids?: string[]
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          interval: string
          plan: string
          price_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          interval?: string
          plan?: string
          price_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          interval?: string
          plan?: string
          price_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_models: {
        Row: {
          age: number
          created_at: string
          gender: string
          height: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          age: number
          created_at?: string
          gender: string
          height: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          age?: number
          created_at?: string
          gender?: string
          height?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          created_at: string
          event: string
          feedback: string | null
          formality: string | null
          id: string
          is_favorite: boolean
          is_night: boolean | null
          latitude: number
          location_name: string
          longitude: number
          plan_date: string
          plan_time: string | null
          rain_probability: number | null
          recommendation: string | null
          recommended_item_ids: string[] | null
          recommended_wishlist_ids: string[] | null
          season: string | null
          shopping_suggestions: Json | null
          temperature: number | null
          updated_at: string
          user_id: string
          weather: string | null
          weather_label: string | null
          weather_synced_at: string | null
          wind_kmh: number | null
        }
        Insert: {
          created_at?: string
          event: string
          feedback?: string | null
          formality?: string | null
          id?: string
          is_favorite?: boolean
          is_night?: boolean | null
          latitude: number
          location_name: string
          longitude: number
          plan_date: string
          plan_time?: string | null
          rain_probability?: number | null
          recommendation?: string | null
          recommended_item_ids?: string[] | null
          recommended_wishlist_ids?: string[] | null
          season?: string | null
          shopping_suggestions?: Json | null
          temperature?: number | null
          updated_at?: string
          user_id: string
          weather?: string | null
          weather_label?: string | null
          weather_synced_at?: string | null
          wind_kmh?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          feedback?: string | null
          formality?: string | null
          id?: string
          is_favorite?: boolean
          is_night?: boolean | null
          latitude?: number
          location_name?: string
          longitude?: number
          plan_date?: string
          plan_time?: string | null
          rain_probability?: number | null
          recommendation?: string | null
          recommended_item_ids?: string[] | null
          recommended_wishlist_ids?: string[] | null
          season?: string | null
          shopping_suggestions?: Json | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
          weather?: string | null
          weather_label?: string | null
          weather_synced_at?: string | null
          wind_kmh?: number | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          currency: string
          free_shipping: boolean | null
          id: string
          image: string | null
          permalink: string
          price: number
          product_id: string
          seller: string | null
          thumbnail: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          free_shipping?: boolean | null
          id?: string
          image?: string | null
          permalink: string
          price: number
          product_id: string
          seller?: string | null
          thumbnail: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          free_shipping?: boolean | null
          id?: string
          image?: string | null
          permalink?: string
          price?: number
          product_id?: string
          seller?: string | null
          thumbnail?: string
          title?: string
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
    Enums: {},
  },
} as const
