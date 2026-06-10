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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name_ar: string
          name_en: string
          parent_id: string | null
          services_count: number | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar: string
          name_en: string
          parent_id?: string | null
          services_count?: number | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          services_count?: number | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          collection_name: string | null
          created_at: string
          id: string
          service_id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          id?: string
          service_id: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string
          id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          delivered_at: string | null
          id: string
          package_type: Database["public"]["Enums"]["package_type"] | null
          price: number
          project_id: string | null
          requirements: string | null
          seller_id: string
          service_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          delivered_at?: string | null
          id?: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          price: number
          project_id?: string | null
          requirements?: string | null
          seller_id: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          delivered_at?: string | null
          id?: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          price?: number
          project_id?: string | null
          requirements?: string | null
          seller_id?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          languages: string[] | null
          rating: number | null
          response_time_hours: number | null
          reviews_count: number | null
          seller_level: Database["public"]["Enums"]["seller_level"] | null
          skills: string[] | null
          total_earnings: number | null
          total_orders: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          languages?: string[] | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          seller_level?: Database["public"]["Enums"]["seller_level"] | null
          skills?: string[] | null
          total_earnings?: number | null
          total_orders?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          rating?: number | null
          response_time_hours?: number | null
          reviews_count?: number | null
          seller_level?: Database["public"]["Enums"]["seller_level"] | null
          skills?: string[] | null
          total_earnings?: number | null
          total_orders?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          attachments: string[] | null
          budget_max: number
          budget_min: number
          buyer_id: string
          category_id: string | null
          created_at: string
          deadline_days: number
          description: string
          id: string
          proposals_count: number | null
          skills_required: string[] | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          attachments?: string[] | null
          budget_max: number
          budget_min: number
          buyer_id: string
          category_id?: string | null
          created_at?: string
          deadline_days: number
          description: string
          id?: string
          proposals_count?: number | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          attachments?: string[] | null
          budget_max?: number
          budget_min?: number
          buyer_id?: string
          category_id?: string | null
          created_at?: string
          deadline_days?: number
          description?: string
          id?: string
          proposals_count?: number | null
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          cover_letter: string
          created_at: string
          delivery_days: number
          freelancer_id: string
          id: string
          portfolio_samples: string[] | null
          price: number
          project_id: string
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
        }
        Insert: {
          cover_letter: string
          created_at?: string
          delivery_days: number
          freelancer_id: string
          id?: string
          portfolio_samples?: string[] | null
          price: number
          project_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Update: {
          cover_letter?: string
          created_at?: string
          delivery_days?: number
          freelancer_id?: string
          id?: string
          portfolio_samples?: string[] | null
          price?: number
          project_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          delivery_days: number
          description: string | null
          features: string[] | null
          id: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          revisions: number | null
          service_id: string
          title: string
        }
        Insert: {
          created_at?: string
          delivery_days: number
          description?: string | null
          features?: string[] | null
          id?: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          revisions?: number | null
          service_id: string
          title: string
        }
        Update: {
          created_at?: string
          delivery_days?: number
          description?: string | null
          features?: string[] | null
          id?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          price?: number
          revisions?: number | null
          service_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          delivery_days: number
          description: string
          features: string[] | null
          gallery_images: string[] | null
          id: string
          is_quick: boolean | null
          orders_count: number | null
          price: number
          rating: number | null
          reviews_count: number | null
          revisions: number | null
          seller_id: string
          status: Database["public"]["Enums"]["service_status"]
          tags: string[] | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          delivery_days?: number
          description: string
          features?: string[] | null
          gallery_images?: string[] | null
          id?: string
          is_quick?: boolean | null
          orders_count?: number | null
          price: number
          rating?: number | null
          reviews_count?: number | null
          revisions?: number | null
          seller_id: string
          status?: Database["public"]["Enums"]["service_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          delivery_days?: number
          description?: string
          features?: string[] | null
          gallery_images?: string[] | null
          id?: string
          is_quick?: boolean | null
          orders_count?: number | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          revisions?: number | null
          seller_id?: string
          status?: Database["public"]["Enums"]["service_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_financials: {
        Args: never
        Returns: {
          total_earnings: number
          total_orders: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "buyer" | "seller" | "both"
      app_role: "admin" | "moderator" | "user"
      notification_type:
        | "order"
        | "message"
        | "review"
        | "proposal"
        | "payment"
        | "system"
      order_status:
        | "pending"
        | "active"
        | "delivered"
        | "completed"
        | "cancelled"
        | "disputed"
      package_type: "basic" | "standard" | "premium"
      project_status: "open" | "in_progress" | "completed" | "cancelled"
      proposal_status: "pending" | "accepted" | "rejected" | "withdrawn"
      seller_level: "new" | "active" | "pro" | "elite"
      service_status: "draft" | "active" | "paused" | "rejected"
      transaction_status: "pending" | "completed" | "failed"
      transaction_type: "earning" | "withdrawal" | "purchase" | "refund"
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
      account_type: ["buyer", "seller", "both"],
      app_role: ["admin", "moderator", "user"],
      notification_type: [
        "order",
        "message",
        "review",
        "proposal",
        "payment",
        "system",
      ],
      order_status: [
        "pending",
        "active",
        "delivered",
        "completed",
        "cancelled",
        "disputed",
      ],
      package_type: ["basic", "standard", "premium"],
      project_status: ["open", "in_progress", "completed", "cancelled"],
      proposal_status: ["pending", "accepted", "rejected", "withdrawn"],
      seller_level: ["new", "active", "pro", "elite"],
      service_status: ["draft", "active", "paused", "rejected"],
      transaction_status: ["pending", "completed", "failed"],
      transaction_type: ["earning", "withdrawal", "purchase", "refund"],
    },
  },
} as const
