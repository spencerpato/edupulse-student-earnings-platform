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
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          ipn_data: Json | null
          merchant_reference: string
          payment_status: string
          pesapal_tracking_id: string | null
          phone_number: string
          referred_by: string | null
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          ipn_data?: Json | null
          merchant_reference: string
          payment_status?: string
          pesapal_tracking_id?: string | null
          phone_number: string
          referred_by?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          ipn_data?: Json | null
          merchant_reference?: string
          payment_status?: string
          pesapal_tracking_id?: string | null
          phone_number?: string
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_balance: number | null
          avatar_url: string | null
          completed_surveys: number | null
          contact_number: string | null
          created_at: string | null
          email: string
          full_name: string
          has_withdrawn: boolean | null
          held_balance: number | null
          id: string
          is_restricted: boolean | null
          quality_score: number | null
          quality_status: Database["public"]["Enums"]["quality_status"] | null
          referral_code: string
          referred_by: string | null
          total_earnings: number | null
          updated_at: string | null
        }
        Insert: {
          approved_balance?: number | null
          avatar_url?: string | null
          completed_surveys?: number | null
          contact_number?: string | null
          created_at?: string | null
          email: string
          full_name: string
          has_withdrawn?: boolean | null
          held_balance?: number | null
          id: string
          is_restricted?: boolean | null
          quality_score?: number | null
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          referral_code: string
          referred_by?: string | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_balance?: number | null
          avatar_url?: string | null
          completed_surveys?: number | null
          contact_number?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          has_withdrawn?: boolean | null
          held_balance?: number | null
          id?: string
          is_restricted?: boolean | null
          quality_score?: number | null
          quality_status?: Database["public"]["Enums"]["quality_status"] | null
          referral_code?: string
          referred_by?: string | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_withdrawable: boolean | null
          referred_user_id: string
          referrer_id: string
          survey_response_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          is_withdrawable?: boolean | null
          referred_user_id: string
          referrer_id: string
          survey_response_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_withdrawable?: boolean | null
          referred_user_id?: string
          referrer_id?: string
          survey_response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean | null
          survey_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required?: boolean | null
          survey_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string | null
          flag_reason: string | null
          id: string
          is_approved: boolean | null
          is_flagged: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          survey_id: string
          time_taken_seconds: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_approved?: boolean | null
          is_flagged?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          survey_id: string
          time_taken_seconds: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_approved?: boolean | null
          is_flagged?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          survey_id?: string
          time_taken_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reward_amount: number
          time_limit_minutes: number
          title: string
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_amount: number
          time_limit_minutes: number
          title: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reward_amount?: number
          time_limit_minutes?: number
          title?: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      quality_status: "good" | "caution" | "restricted"
      question_type: "mcq" | "checkbox" | "rating" | "likert" | "text"
      withdrawal_status: "pending" | "approved" | "rejected" | "held"
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
      app_role: ["admin", "user"],
      quality_status: ["good", "caution", "restricted"],
      question_type: ["mcq", "checkbox", "rating", "likert", "text"],
      withdrawal_status: ["pending", "approved", "rejected", "held"],
    },
  },
} as const
