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
      clothing_items: {
        Row: {
          category: string
          color: string | null
          created_at: string
          id: string
          image_url: string
          is_favorite: boolean
          name: string
          user_id: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_favorite?: boolean
          name: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_favorite?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      outfit_history: {
        Row: {
          created_at: string
          event: string
          formality: string | null
          id: string
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
          formality?: string | null
          id?: string
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
          formality?: string | null
          id?: string
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
      weekly_plans: {
        Row: {
          created_at: string
          event: string
          formality: string | null
          id: string
          is_night: boolean | null
          latitude: number
          location_name: string
          longitude: number
          plan_date: string
          plan_time: string | null
          rain_probability: number | null
          recommendation: string | null
          recommended_item_ids: string[] | null
          season: string | null
          temperature: number | null
          updated_at: string
          user_id: string
          weather: string | null
          weather_label: string | null
          wind_kmh: number | null
        }
        Insert: {
          created_at?: string
          event: string
          formality?: string | null
          id?: string
          is_night?: boolean | null
          latitude: number
          location_name: string
          longitude: number
          plan_date: string
          plan_time?: string | null
          rain_probability?: number | null
          recommendation?: string | null
          recommended_item_ids?: string[] | null
          season?: string | null
          temperature?: number | null
          updated_at?: string
          user_id: string
          weather?: string | null
          weather_label?: string | null
          wind_kmh?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          formality?: string | null
          id?: string
          is_night?: boolean | null
          latitude?: number
          location_name?: string
          longitude?: number
          plan_date?: string
          plan_time?: string | null
          rain_probability?: number | null
          recommendation?: string | null
          recommended_item_ids?: string[] | null
          season?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string
          weather?: string | null
          weather_label?: string | null
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
