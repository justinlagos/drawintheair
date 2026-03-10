export type Database = {
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          tier: 'free' | 'trial' | 'pro' | 'school' | 'admin'
          trial_started_at: string | null
          trial_expires_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          school_id: string | null
          is_admin: boolean
          settings: {
            notifications_enabled?: boolean
            dark_mode?: boolean
            email_digest?: 'daily' | 'weekly' | 'never'
            [key: string]: unknown
          } | null
          onboarded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string | null
          tier?: 'free' | 'trial' | 'pro' | 'school' | 'admin'
          trial_started_at?: string | null
          trial_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          school_id?: string | null
          is_admin?: boolean
          settings?: Record<string, unknown> | null
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          tier?: 'free' | 'trial' | 'pro' | 'school' | 'admin'
          trial_started_at?: string | null
          trial_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          school_id?: string | null
          is_admin?: boolean
          settings?: Record<string, unknown> | null
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          teacher_id: string
          session_code: string
          status: 'active' | 'completed' | 'paused'
          started_at: string
          ended_at: string | null
          scoreboard_mode: 'individual' | 'team' | 'hidden'
          school_id: string | null
          playlist_id: string | null
          metadata: {
            gesture_count?: number
            avg_accuracy?: number
            theme?: string
            [key: string]: unknown
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          session_code: string
          status?: 'active' | 'completed' | 'paused'
          started_at?: string
          ended_at?: string | null
          scoreboard_mode?: 'individual' | 'team' | 'hidden'
          school_id?: string | null
          playlist_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          session_code?: string
          status?: 'active' | 'completed' | 'paused'
          started_at?: string
          ended_at?: string | null
          scoreboard_mode?: 'individual' | 'team' | 'hidden'
          school_id?: string | null
          playlist_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      session_students: {
        Row: {
          id: string
          session_id: string
          student_name: string
          student_avatar: string | null
          joined_at: string
          left_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          student_name: string
          student_avatar?: string | null
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          student_name?: string
          student_avatar?: string | null
          joined_at?: string
          left_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      round_scores: {
        Row: {
          id: string
          session_id: string
          session_student_id: string
          round_number: number
          gesture_name: string
          accuracy: number
          completed: boolean
          duration_seconds: number
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          session_student_id: string
          round_number: number
          gesture_name: string
          accuracy: number
          completed: boolean
          duration_seconds: number
          score: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          session_student_id?: string
          round_number?: number
          gesture_name?: string
          accuracy?: number
          completed?: boolean
          duration_seconds?: number
          score?: number
          created_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string | null
          phone: string | null
          website: string | null
          subscription_tier: 'free' | 'pro'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          admin_teacher_id: string
          settings: {
            custom_branding?: boolean
            sso_enabled?: boolean
            max_teachers?: number
            [key: string]: unknown
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          admin_teacher_id: string
          settings?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string | null
          phone?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          admin_teacher_id?: string
          settings?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      school_teachers: {
        Row: {
          id: string
          school_id: string
          teacher_id: string
          role: 'member' | 'admin'
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          teacher_id: string
          role?: 'member' | 'admin'
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          teacher_id?: string
          role?: 'member' | 'admin'
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      school_invites: {
        Row: {
          id: string
          school_id: string
          email: string
          token: string
          status: 'pending' | 'accepted' | 'rejected'
          expires_at: string
          invited_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          email: string
          token: string
          status?: 'pending' | 'accepted' | 'rejected'
          expires_at: string
          invited_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          email?: string
          token?: string
          status?: 'pending' | 'accepted' | 'rejected'
          expires_at?: string
          invited_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          teacher_id: string
          name: string
          description: string | null
          gestures: string[]
          difficulty: 'easy' | 'medium' | 'hard'
          duration_minutes: number
          is_public: boolean
          school_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          name: string
          description?: string | null
          gestures: string[]
          difficulty?: 'easy' | 'medium' | 'hard'
          duration_minutes: number
          is_public?: boolean
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          name?: string
          description?: string | null
          gestures?: string[]
          difficulty?: 'easy' | 'medium' | 'hard'
          duration_minutes?: number
          is_public?: boolean
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teacher_insights: {
        Row: {
          id: string
          teacher_id: string
          metric: string
          value: number
          period: 'day' | 'week' | 'month'
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          metric: string
          value: number
          period?: 'day' | 'week' | 'month'
          recorded_at: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          metric?: string
          value?: number
          period?: 'day' | 'week' | 'month'
          recorded_at?: string
          created_at?: string
        }
      }
      platform_insights: {
        Row: {
          id: string
          metric: string
          value: number
          period: 'day' | 'week' | 'month'
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          metric: string
          value: number
          period?: 'day' | 'week' | 'month'
          recorded_at: string
          created_at?: string
        }
        Update: {
          id?: string
          metric?: string
          value?: number
          period?: 'day' | 'week' | 'month'
          recorded_at?: string
          created_at?: string
        }
      }
      client_errors: {
        Row: {
          id: string
          teacher_id: string | null
          error_message: string
          error_stack: string | null
          page_url: string | null
          user_agent: string | null
          metadata: {
            [key: string]: unknown
          } | null
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id?: string | null
          error_message: string
          error_stack?: string | null
          page_url?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string | null
          error_message?: string
          error_stack?: string | null
          page_url?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
      }
      admin_alerts: {
        Row: {
          id: string
          alert_type: string
          severity: 'info' | 'warning' | 'error' | 'critical'
          message: string
          data: {
            [key: string]: unknown
          } | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_type: string
          severity?: 'info' | 'warning' | 'error' | 'critical'
          message: string
          data?: Record<string, unknown> | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alert_type?: string
          severity?: 'info' | 'warning' | 'error' | 'critical'
          message?: string
          data?: Record<string, unknown> | null
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      v_teacher_session_stats: {
        Row: {
          teacher_id: string
          total_sessions: number
          total_students: number
          avg_session_duration: number | null
          last_session_at: string | null
        }
      }
      v_activity_performance: {
        Row: {
          gesture_name: string
          total_attempts: number
          avg_accuracy: number
          completion_rate: number
          last_used_at: string | null
        }
      }
      v_engagement_metrics: {
        Row: {
          period: string
          active_teachers: number
          total_sessions: number
          total_students_engaged: number
          avg_session_accuracy: number
        }
      }
      v_school_overview: {
        Row: {
          school_id: string
          school_name: string
          teacher_count: number
          total_sessions: number
          avg_students_per_session: number
          subscription_tier: 'free' | 'pro'
        }
      }
      v_growth_metrics: {
        Row: {
          cohort_date: string
          new_teachers: number
          new_schools: number
          trial_conversions: number
          churn_count: number
        }
      }
    }
    Functions: {
      get_effective_tier: {
        Args: {
          teacher_id: string
        }
        Returns: 'free' | 'trial' | 'pro' | 'school' | 'admin'
      }
    }
    Enums: {
      teacher_tier: 'free' | 'trial' | 'pro' | 'school' | 'admin'
      session_status: 'active' | 'completed' | 'paused'
      scoreboard_mode: 'individual' | 'team' | 'hidden'
      school_role: 'member' | 'admin'
      difficulty_level: 'easy' | 'medium' | 'hard'
      metric_period: 'day' | 'week' | 'month'
      alert_severity: 'info' | 'warning' | 'error' | 'critical'
      invite_status: 'pending' | 'accepted' | 'rejected'
    }
  }
}
