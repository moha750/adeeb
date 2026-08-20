// أنواعُ قاعدةِ البيانات: مولَّدةٌ آليًّا بتاريخ 2026-08-16.
// لا تُحرَّر بيد. لإعادة توليدها: أداةُ Supabase `generate_typescript_types`
// (أو `supabase gen types typescript`)، ثمّ يُستبدَل الملفُّ كلُّه.
// مصدرُ الحقيقةِ سكيمةُ المشروع الحيّ، وما دونها في الكود يتبعُها لا العكس.

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          count_number: number
          created_at: string | null
          created_by: string | null
          icon_class: string | null
          id: string
          label: string
          order: number
          plus_flag: boolean | null
        }
        Insert: {
          count_number?: number
          created_at?: string | null
          created_by?: string | null
          icon_class?: string | null
          id?: string
          label: string
          order?: number
          plus_flag?: boolean | null
        }
        Update: {
          count_number?: number
          created_at?: string | null
          created_by?: string | null
          icon_class?: string | null
          id?: string
          label?: string
          order?: number
          plus_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          female_seats: number | null
          id: string
          is_cancelled: boolean
          is_published: boolean
          location: string | null
          location_url: string | null
          male_percentage: number | null
          male_seats: number | null
          name: string
          organizing_committee_id: number | null
          organizing_department_id: number | null
          start_time: string
          target_gender: string | null
          total_seats: number | null
          updated_at: string
        }
        Insert: {
          activity_date: string
          activity_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          female_seats?: number | null
          id?: string
          is_cancelled?: boolean
          is_published?: boolean
          location?: string | null
          location_url?: string | null
          male_percentage?: number | null
          male_seats?: number | null
          name: string
          organizing_committee_id?: number | null
          organizing_department_id?: number | null
          start_time: string
          target_gender?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          female_seats?: number | null
          id?: string
          is_cancelled?: boolean
          is_published?: boolean
          location?: string | null
          location_url?: string | null
          male_percentage?: number | null
          male_seats?: number | null
          name?: string
          organizing_committee_id?: number | null
          organizing_department_id?: number | null
          start_time?: string
          target_gender?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organizing_committee_id_fkey"
            columns: ["organizing_committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organizing_department_id_fkey"
            columns: ["organizing_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: number
          ip_address: string | null
          target_id: string
          target_type: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: number
          ip_address?: string | null
          target_id: string
          target_type: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: number
          ip_address?: string | null
          target_id?: string
          target_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reservations: {
        Row: {
          activity_id: string
          attendance_marked_by: string | null
          attendance_status: string
          attended_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          certificate_sent_at: string | null
          certificate_sent_by: string | null
          certificate_serial: string | null
          gender_at_booking: string
          id: string
          reserved_at: string
          status: string
          user_id: string
          whatsapp_confirmed_at: string | null
          whatsapp_confirmed_by: string | null
        }
        Insert: {
          activity_id: string
          attendance_marked_by?: string | null
          attendance_status?: string
          attended_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          certificate_sent_at?: string | null
          certificate_sent_by?: string | null
          certificate_serial?: string | null
          gender_at_booking: string
          id?: string
          reserved_at?: string
          status?: string
          user_id: string
          whatsapp_confirmed_at?: string | null
          whatsapp_confirmed_by?: string | null
        }
        Update: {
          activity_id?: string
          attendance_marked_by?: string | null
          attendance_status?: string
          attended_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          certificate_sent_at?: string | null
          certificate_sent_by?: string | null
          certificate_serial?: string | null
          gender_at_booking?: string
          id?: string
          reserved_at?: string
          status?: string
          user_id?: string
          whatsapp_confirmed_at?: string | null
          whatsapp_confirmed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_reservations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reservations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_key: string
          created_at: string
          description_ar: string
          icon: string
          id: string
          is_active: boolean
          kind: string
          name_ar: string
          rule_key: string | null
          show_locked: boolean
          sort_order: number
          threshold: number | null
        }
        Insert: {
          badge_key: string
          created_at?: string
          description_ar: string
          icon: string
          id?: string
          is_active?: boolean
          kind?: string
          name_ar: string
          rule_key?: string | null
          show_locked?: boolean
          sort_order?: number
          threshold?: number | null
        }
        Update: {
          badge_key?: string
          created_at?: string
          description_ar?: string
          icon?: string
          id?: string
          is_active?: boolean
          kind?: string
          name_ar?: string
          rule_key?: string | null
          show_locked?: boolean
          sort_order?: number
          threshold?: number | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          guest_identifier: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          guest_identifier?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          guest_identifier?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "news_public_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_supervision: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          committee_id: number
          id: number
          notes: string | null
          supervisor_id: string
          unit_id: number
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          committee_id: number
          id?: number
          notes?: string | null
          supervisor_id: string
          unit_id: number
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          committee_id?: number
          id?: number
          notes?: string | null
          supervisor_id?: string
          unit_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "committee_supervision_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_supervision_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_supervision_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_supervision_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_supervision_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_supervision_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          committee_name_ar: string
          council_id: string
          created_at: string
          department_id: number | null
          description: string | null
          group_link: string | null
          id: number
          is_active: boolean
          leader_role_name: string
          member_role_name: string
          updated_at: string
        }
        Insert: {
          committee_name_ar: string
          council_id?: string
          created_at?: string
          department_id?: number | null
          description?: string | null
          group_link?: string | null
          id?: number
          is_active?: boolean
          leader_role_name: string
          member_role_name: string
          updated_at?: string
        }
        Update: {
          committee_name_ar?: string
          council_id?: string
          created_at?: string
          department_id?: number | null
          description?: string | null
          group_link?: string | null
          id?: number
          is_active?: boolean
          leader_role_name?: string
          member_role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committees_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          priority: string | null
          replied_at: string | null
          replied_by: string | null
          reply_message: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          priority?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          priority?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      councils: {
        Row: {
          created_at: string | null
          description: string | null
          group_link: string | null
          head_role_name: string
          id: string
          name_ar: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_link?: string | null
          head_role_name: string
          id: string
          name_ar: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_link?: string | null
          head_role_name?: string
          id?: string
          name_ar?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "councils_head_role_name_fkey"
            columns: ["head_role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      departments: {
        Row: {
          council_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          group_link: string | null
          id: number
          is_active: boolean | null
          name_ar: string
          name_en: string
          updated_at: string | null
        }
        Insert: {
          council_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_link?: string | null
          id?: number
          is_active?: boolean | null
          name_ar: string
          name_en: string
          updated_at?: string | null
        }
        Update: {
          council_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          group_link?: string | null
          id?: number
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "councils"
            referencedColumns: ["id"]
          },
        ]
      }
      election_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          election_id: string | null
          event_type: string
          id: number
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          election_id?: string | null
          event_type: string
          id?: number
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          election_id?: string | null
          event_type?: string
          id?: number
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "election_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_audit_log_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_candidates: {
        Row: {
          candidate_number: number
          election_id: string
          file_mime: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          preference_rank: number
          review_note_ar: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          statement_ar: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          candidate_number: number
          election_id: string
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          preference_rank?: number
          review_note_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_ar: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          candidate_number?: number
          election_id?: string
          file_mime?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          preference_rank?: number
          review_note_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_ar?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      election_votes: {
        Row: {
          candidate_id: string
          created_at: string
          election_id: string
          id: string
          vote_choice: string
          vote_weight: number
          voter_id: string
          voter_role_snapshot: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
          vote_choice?: string
          vote_weight: number
          voter_id: string
          voter_role_snapshot: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
          vote_choice?: string
          vote_weight?: number
          voter_id?: string
          voter_role_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          archived_at: string | null
          candidacy_auto_extended_at: string | null
          candidacy_end: string | null
          candidacy_extended_once: boolean
          candidacy_opened_at: string | null
          created_at: string
          created_by: string
          id: string
          stalled_at: string | null
          status: string
          target_committee_id: number | null
          target_department_id: number | null
          target_role_name: string
          updated_at: string
          voting_end: string | null
          voting_opened_at: string | null
          winner_candidate_id: string | null
          winner_declared_at: string | null
          winner_declared_by: string | null
        }
        Insert: {
          archived_at?: string | null
          candidacy_auto_extended_at?: string | null
          candidacy_end?: string | null
          candidacy_extended_once?: boolean
          candidacy_opened_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          stalled_at?: string | null
          status?: string
          target_committee_id?: number | null
          target_department_id?: number | null
          target_role_name: string
          updated_at?: string
          voting_end?: string | null
          voting_opened_at?: string | null
          winner_candidate_id?: string | null
          winner_declared_at?: string | null
          winner_declared_by?: string | null
        }
        Update: {
          archived_at?: string | null
          candidacy_auto_extended_at?: string | null
          candidacy_end?: string | null
          candidacy_extended_once?: boolean
          candidacy_opened_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          stalled_at?: string | null
          status?: string
          target_committee_id?: number | null
          target_department_id?: number | null
          target_role_name?: string
          updated_at?: string
          voting_end?: string | null
          voting_opened_at?: string | null
          winner_candidate_id?: string | null
          winner_declared_at?: string | null
          winner_declared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_target_committee_id_fkey"
            columns: ["target_committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_target_department_id_fkey"
            columns: ["target_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_winner_declared_by_fkey"
            columns: ["winner_declared_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_winner_declared_by_fkey"
            columns: ["winner_declared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elections_winner_fk"
            columns: ["winner_candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_certificates: {
        Row: {
          committee_id: number | null
          created_at: string
          holder_name: string
          id: string
          issued_by: string | null
          period_from: string
          period_to: string
          position_title: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_at_issue: string | null
          serial: string
          status: string
          user_id: string
        }
        Insert: {
          committee_id?: number | null
          created_at?: string
          holder_name: string
          id?: string
          issued_by?: string | null
          period_from: string
          period_to: string
          position_title: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_at_issue?: string | null
          serial: string
          status?: string
          user_id: string
        }
        Update: {
          committee_id?: number | null
          created_at?: string
          holder_name?: string
          id?: string
          issued_by?: string | null
          period_from?: string
          period_to?: string
          position_title?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_at_issue?: string | null
          serial?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_certificates_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          answer: string
          created_at: string | null
          created_by: string | null
          id: string
          order: number
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          order?: number
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          order?: number
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_downloads: {
        Row: {
          country: string | null
          downloaded_at: string | null
          file_key: string
          file_name: string
          id: number
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          downloaded_at?: string | null
          file_key: string
          file_name: string
          id?: number
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          downloaded_at?: string | null
          file_key?: string
          file_name?: string
          id?: number
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      guess_word_answers: {
        Row: {
          answer: string
          id: string
          player_id: string
          response_ms: number
          submitted_at: string
          word_id: string
        }
        Insert: {
          answer: string
          id?: string
          player_id: string
          response_ms: number
          submitted_at?: string
          word_id: string
        }
        Update: {
          answer?: string
          id?: string
          player_id?: string
          response_ms?: number
          submitted_at?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guess_word_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "guess_word_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guess_word_answers_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "guess_word_words"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_word_players: {
        Row: {
          id: string
          is_kicked: boolean
          joined_at: string
          name: string
          player_token: string
          score: number
          session_id: string
        }
        Insert: {
          id?: string
          is_kicked?: boolean
          joined_at?: string
          name: string
          player_token: string
          score?: number
          session_id: string
        }
        Update: {
          id?: string
          is_kicked?: boolean
          joined_at?: string
          name?: string
          player_token?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guess_word_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guess_word_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_word_sessions: {
        Row: {
          code: string
          created_at: string
          created_by: string
          current_word_id: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          time_per_word: number
          title: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          current_word_id?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          time_per_word?: number
          title?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          current_word_id?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          time_per_word?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guess_word_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guess_word_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guess_word_sessions_current_word_fk"
            columns: ["current_word_id"]
            isOneToOne: false
            referencedRelation: "guess_word_words"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_word_words: {
        Row: {
          ended_at: string | null
          id: string
          position: number
          session_id: string
          started_at: string | null
          winner_player_id: string | null
          word: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          position: number
          session_id: string
          started_at?: string | null
          winner_player_id?: string | null
          word: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          position?: number
          session_id?: string
          started_at?: string | null
          winner_player_id?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "guess_word_words_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guess_word_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guess_word_words_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "guess_word_players"
            referencedColumns: ["id"]
          },
        ]
      }
      iso_countries: {
        Row: {
          code: string
          name_ar: string
          name_en: string
        }
        Insert: {
          code: string
          name_ar: string
          name_en: string
        }
        Update: {
          code?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          cover_page_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_featured: boolean
          kind: string
          order: number
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          views: number
          year_gregorian: number | null
          year_hijri: number | null
        }
        Insert: {
          cover_page_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          kind?: string
          order?: number
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          views?: number
          year_gregorian?: number | null
          year_hijri?: number | null
        }
        Update: {
          cover_page_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_featured?: boolean
          kind?: string
          order?: number
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          views?: number
          year_gregorian?: number | null
          year_hijri?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_cover_fk"
            columns: ["cover_page_id"]
            isOneToOne: false
            referencedRelation: "library_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      library_pages: {
        Row: {
          alt_text: string | null
          book_id: string
          created_at: string
          height: number | null
          id: string
          is_hard: boolean
          label: string | null
          page_number: number
          storage_path: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          book_id: string
          created_at?: string
          height?: number | null
          id?: string
          is_hard?: boolean
          label?: string | null
          page_number: number
          storage_path: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          book_id?: string
          created_at?: string
          height?: number | null
          id?: string
          is_hard?: boolean
          label?: string | null
          page_number?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      member_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          evidence: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at: string
          evidence?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          evidence?: string | null
          granted_by?: string | null
          id?: string
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
          {
            foreignKeyName: "member_badges_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_badges_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_details: {
        Row: {
          academic_degree: string
          academic_record_number: string | null
          birth_date: string
          college: string | null
          created_at: string | null
          favorite_color: string | null
          full_name_triple: string | null
          id: string
          instagram_account: string | null
          linkedin_account: string | null
          major: string | null
          national_id: string
          notes: string | null
          profile_slug: string | null
          tiktok_account: string | null
          twitter_account: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academic_degree: string
          academic_record_number?: string | null
          birth_date: string
          college?: string | null
          created_at?: string | null
          favorite_color?: string | null
          full_name_triple?: string | null
          id?: string
          instagram_account?: string | null
          linkedin_account?: string | null
          major?: string | null
          national_id: string
          notes?: string | null
          profile_slug?: string | null
          tiktok_account?: string | null
          twitter_account?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academic_degree?: string
          academic_record_number?: string | null
          birth_date?: string
          college?: string | null
          created_at?: string | null
          favorite_color?: string | null
          full_name_triple?: string | null
          id?: string
          instagram_account?: string | null
          linkedin_account?: string | null
          major?: string | null
          national_id?: string
          notes?: string | null
          profile_slug?: string | null
          tiktok_account?: string | null
          twitter_account?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_evaluations: {
        Row: {
          areas_for_improvement: string | null
          attendance_score: number | null
          committee_id: number | null
          created_at: string
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_id: string
          id: number
          notes: string | null
          overall_score: number | null
          performance_score: number | null
          quality_score: number | null
          strengths: string | null
          teamwork_score: number | null
          user_id: string
        }
        Insert: {
          areas_for_improvement?: string | null
          attendance_score?: number | null
          committee_id?: number | null
          created_at?: string
          evaluation_period_end: string
          evaluation_period_start: string
          evaluator_id: string
          id?: number
          notes?: string | null
          overall_score?: number | null
          performance_score?: number | null
          quality_score?: number | null
          strengths?: string | null
          teamwork_score?: number | null
          user_id: string
        }
        Update: {
          areas_for_improvement?: string | null
          attendance_score?: number | null
          committee_id?: number | null
          created_at?: string
          evaluation_period_end?: string
          evaluation_period_start?: string
          evaluator_id?: string
          id?: number
          notes?: string | null
          overall_score?: number | null
          performance_score?: number | null
          quality_score?: number | null
          strengths?: string | null
          teamwork_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_evaluations_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_warnings: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          caused_termination: boolean
          committee_id: number | null
          created_at: string
          id: string
          issued_by: string
          occurred_on: string | null
          reason: string
          role_at_issue: string | null
          status: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category: string
          caused_termination?: boolean
          committee_id?: number | null
          created_at?: string
          id?: string
          issued_by: string
          occurred_on?: string | null
          reason: string
          role_at_issue?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          caused_termination?: boolean
          committee_id?: number | null
          created_at?: string
          id?: string
          issued_by?: string
          occurred_on?: string | null
          reason?: string
          role_at_issue?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_warnings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_role_at_issue_fkey"
            columns: ["role_at_issue"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
          {
            foreignKeyName: "member_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications: {
        Row: {
          applied_at: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          recommend_note: string | null
          recommended_at: string | null
          recommended_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          recommend_note?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          recommend_note?: string | null
          recommended_at?: string | null
          recommended_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_recommended_by_fkey"
            columns: ["recommended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_authority: {
        Row: {
          blocked_roles: string[]
          note: string | null
          role_name: string
          scope: string
        }
        Insert: {
          blocked_roles?: string[]
          note?: string | null
          role_name: string
          scope: string
        }
        Update: {
          blocked_roles?: string[]
          note?: string | null
          role_name?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_termination_authority_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      news: {
        Row: {
          authors: string[] | null
          category: string
          committee_id: number | null
          content: string
          cover_photographer: string | null
          created_at: string | null
          created_by: string | null
          gallery_images: string[] | null
          gallery_photographers: string[] | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          likes_count: number | null
          published_at: string | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          submitted_at: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
          workflow_status: string | null
        }
        Insert: {
          authors?: string[] | null
          category?: string
          committee_id?: number | null
          content: string
          cover_photographer?: string | null
          created_at?: string | null
          created_by?: string | null
          gallery_images?: string[] | null
          gallery_photographers?: string[] | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          submitted_at?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
          workflow_status?: string | null
        }
        Update: {
          authors?: string[] | null
          category?: string
          committee_id?: number | null
          content?: string
          cover_photographer?: string | null
          created_at?: string | null
          created_by?: string | null
          gallery_images?: string[] | null
          gallery_photographers?: string[] | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          submitted_at?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          news_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          news_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          news_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_activity_log_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_collaboration_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_internal: boolean | null
          mentioned_users: string[] | null
          news_id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_users?: string[] | null
          news_id: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_users?: string[] | null
          news_id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_collaboration_comments_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_collaboration_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "news_collaboration_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_collaboration_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_collaboration_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_likes: {
        Row: {
          created_at: string | null
          guest_identifier: string | null
          id: string
          news_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_identifier?: string | null
          id?: string
          news_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_identifier?: string | null
          id?: string
          news_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_likes_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_public_comments: {
        Row: {
          content: string
          created_at: string | null
          guest_name: string | null
          id: string
          is_approved: boolean | null
          news_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          guest_name?: string | null
          id?: string
          is_approved?: boolean | null
          news_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          guest_name?: string | null
          id?: string
          is_approved?: boolean | null
          news_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_public_comments_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_public_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_public_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_writer_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_fields: Json | null
          assignment_notes: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_edited_at: string | null
          news_id: string
          notes: string | null
          notification_sent_at: string | null
          notified: boolean | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          writer_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_fields?: Json | null
          assignment_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_edited_at?: string | null
          news_id: string
          notes?: string | null
          notification_sent_at?: string | null
          notified?: boolean | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          writer_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_fields?: Json | null
          assignment_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_edited_at?: string | null
          news_id?: string
          notes?: string | null
          notification_sent_at?: string | null
          notified?: boolean | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          writer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_writer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_writer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_writer_assignments_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_writer_assignments_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_writer_assignments_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          email_count: number | null
          id: string
          ip_address: unknown
          last_email_sent_at: string | null
          notes: string | null
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_count?: number | null
          id?: string
          ip_address?: unknown
          last_email_sent_at?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_count?: number | null
          id?: string
          ip_address?: unknown
          last_email_sent_at?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: number
          notification_id: number
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: number
          notification_id: number
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: number
          notification_id?: number
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          expires_at: string | null
          icon: string | null
          id: number
          message: string
          metadata: Json | null
          priority: string | null
          sender_id: string | null
          target_audience: string
          target_committee_id: number | null
          target_election_id: string | null
          target_user_ids: string[] | null
          title: string
          type: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: number
          message: string
          metadata?: Json | null
          priority?: string | null
          sender_id?: string | null
          target_audience: string
          target_committee_id?: number | null
          target_election_id?: string | null
          target_user_ids?: string[] | null
          title: string
          type: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: number
          message?: string
          metadata?: Json | null
          priority?: string | null
          sender_id?: string | null
          target_audience?: string
          target_committee_id?: number | null
          target_election_id?: string | null
          target_user_ids?: string[] | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_committee_id_fkey"
            columns: ["target_committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_election_id_fkey"
            columns: ["target_election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      participation_certificates: {
        Row: {
          application_id: string
          committee_name: string | null
          holder_gender: string | null
          holder_name: string
          id: string
          issued_at: string
          issued_by: string | null
          opportunity_title: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          serial: string
          served_from: string
          served_to: string | null
          status: string
          user_id: string
        }
        Insert: {
          application_id: string
          committee_name?: string | null
          holder_gender?: string | null
          holder_name: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          opportunity_title: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          serial: string
          served_from: string
          served_to?: string | null
          status?: string
          user_id: string
        }
        Update: {
          application_id?: string
          committee_name?: string | null
          holder_gender?: string | null
          holder_name?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          opportunity_title?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          serial?: string
          served_from?: string
          served_to?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participation_certificates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "volunteer_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: number
          permission_key: string
          permission_name_ar: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: number
          permission_key: string
          permission_name_ar: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: number
          permission_key?: string
          permission_name_ar?: string
        }
        Relationships: []
      }
      position_authority: {
        Row: {
          blocked_roles: string[]
          note: string | null
          own_unit_roles: string[]
          role_name: string
          target_roles: string[]
        }
        Insert: {
          blocked_roles?: string[]
          note?: string | null
          own_unit_roles?: string[]
          role_name: string
          target_roles?: string[]
        }
        Update: {
          blocked_roles?: string[]
          note?: string | null
          own_unit_roles?: string[]
          role_name?: string
          target_roles?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "position_authority_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: true
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      profile_name_changes: {
        Row: {
          approved: boolean | null
          changed_at: string
          changed_by: string | null
          id: string
          new_name: string
          old_name: string
          reason: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_name: string
          old_name: string
          reason?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_name?: string
          old_name?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_marketing: boolean
          account_status: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          gender: string | null
          id: string
          joined_date: string | null
          phone: string
          public_slug: string | null
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          accepts_marketing?: boolean
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          gender?: string | null
          id: string
          joined_date?: string | null
          phone: string
          public_slug?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          accepts_marketing?: boolean
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          joined_date?: string | null
          phone?: string
          public_slug?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      radio_episode_listeners: {
        Row: {
          device_hash: string
          episode_id: string
          first_at: string
        }
        Insert: {
          device_hash: string
          episode_id: string
          first_at?: string
        }
        Update: {
          device_hash?: string
          episode_id?: string
          first_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_episode_listeners_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "radio_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_episodes: {
        Row: {
          audio_music_bytes: number | null
          audio_music_mime: string
          audio_music_path: string | null
          audio_music_peaks: number[] | null
          audio_music_seconds: number | null
          audio_plain_bytes: number | null
          audio_plain_mime: string
          audio_plain_path: string | null
          audio_plain_peaks: number[] | null
          audio_plain_seconds: number | null
          audio_stem_bytes: number | null
          audio_stem_mime: string | null
          audio_stem_path: string | null
          audio_stem_seconds: number | null
          created_at: string
          created_by: string | null
          host_member_id: string
          id: string
          likes: number
          listeners: number
          notes: string | null
          number: number
          plays: number
          plays_plain: number
          publish_at: string | null
          published_at: string | null
          show_id: string
          slug: string
          status: string
          summary: string | null
          talk_starts_at: number | null
          title: string
          transcript: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          audio_music_bytes?: number | null
          audio_music_mime?: string
          audio_music_path?: string | null
          audio_music_peaks?: number[] | null
          audio_music_seconds?: number | null
          audio_plain_bytes?: number | null
          audio_plain_mime?: string
          audio_plain_path?: string | null
          audio_plain_peaks?: number[] | null
          audio_plain_seconds?: number | null
          audio_stem_bytes?: number | null
          audio_stem_mime?: string | null
          audio_stem_path?: string | null
          audio_stem_seconds?: number | null
          created_at?: string
          created_by?: string | null
          host_member_id: string
          id?: string
          likes?: number
          listeners?: number
          notes?: string | null
          number: number
          plays?: number
          plays_plain?: number
          publish_at?: string | null
          published_at?: string | null
          show_id: string
          slug: string
          status?: string
          summary?: string | null
          talk_starts_at?: number | null
          title: string
          transcript?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          audio_music_bytes?: number | null
          audio_music_mime?: string
          audio_music_path?: string | null
          audio_music_peaks?: number[] | null
          audio_music_seconds?: number | null
          audio_plain_bytes?: number | null
          audio_plain_mime?: string
          audio_plain_path?: string | null
          audio_plain_peaks?: number[] | null
          audio_plain_seconds?: number | null
          audio_stem_bytes?: number | null
          audio_stem_mime?: string | null
          audio_stem_path?: string | null
          audio_stem_seconds?: number | null
          created_at?: string
          created_by?: string | null
          host_member_id?: string
          id?: string
          likes?: number
          listeners?: number
          notes?: string | null
          number?: number
          plays?: number
          plays_plain?: number
          publish_at?: string | null
          published_at?: string | null
          show_id?: string
          slug?: string
          status?: string
          summary?: string | null
          talk_starts_at?: number | null
          title?: string
          transcript?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radio_episodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_episodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_episodes_host_member_id_fkey"
            columns: ["host_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_episodes_host_member_id_fkey"
            columns: ["host_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "radio_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_show_platforms: {
        Row: {
          id: string
          order: number
          platform: string
          show_id: string
          url: string
        }
        Insert: {
          id?: string
          order?: number
          platform: string
          show_id: string
          url: string
        }
        Update: {
          id?: string
          order?: number
          platform?: string
          show_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_show_platforms_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "radio_shows"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_shows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          host_member_id: string
          id: string
          is_featured: boolean
          logo_path: string | null
          order: number
          producing_committee_id: number | null
          published_at: string | null
          slug: string
          status: string
          tagline: string | null
          talk_starts_at: number
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_member_id: string
          id?: string
          is_featured?: boolean
          logo_path?: string | null
          order?: number
          producing_committee_id?: number | null
          published_at?: string | null
          slug: string
          status?: string
          tagline?: string | null
          talk_starts_at?: number
          title: string
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_member_id?: string
          id?: string
          is_featured?: boolean
          logo_path?: string | null
          order?: number
          producing_committee_id?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          tagline?: string | null
          talk_starts_at?: number
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_shows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_shows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_shows_host_member_id_fkey"
            columns: ["host_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_shows_host_member_id_fkey"
            columns: ["host_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_shows_producing_committee_id_fkey"
            columns: ["producing_committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_station: {
        Row: {
          description: string | null
          id: number
          language: string
          logo_path: string | null
          name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: number
          language?: string
          logo_path?: string | null
          name?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: number
          language?: string
          logo_path?: string | null
          name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: number
          role_name: string
        }
        Insert: {
          created_at?: string | null
          permission_id: number
          role_name: string
        }
        Update: {
          created_at?: string | null
          permission_id?: number
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          council_type: string | null
          created_at: string
          description: string | null
          holder_uniqueness: string
          home_committee_id: number | null
          id: number
          is_elected: boolean | null
          membership_kind: string
          prerequisite_role_name: string | null
          role_level: number
          role_name: string
          role_name_ar: string
          vote_weight: number
          votes_in_all_elections: boolean
        }
        Insert: {
          council_type?: string | null
          created_at?: string
          description?: string | null
          holder_uniqueness?: string
          home_committee_id?: number | null
          id?: number
          is_elected?: boolean | null
          membership_kind: string
          prerequisite_role_name?: string | null
          role_level: number
          role_name: string
          role_name_ar: string
          vote_weight: number
          votes_in_all_elections?: boolean
        }
        Update: {
          council_type?: string | null
          created_at?: string
          description?: string | null
          holder_uniqueness?: string
          home_committee_id?: number | null
          id?: number
          is_elected?: boolean | null
          membership_kind?: string
          prerequisite_role_name?: string | null
          role_level?: number
          role_name?: string
          role_name_ar?: string
          vote_weight?: number
          votes_in_all_elections?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "roles_home_committee_id_fkey"
            columns: ["home_committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_prerequisite_role_name_fkey"
            columns: ["prerequisite_role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_name"]
          },
        ]
      }
      site_pageviews: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          city: string | null
          country_code: string | null
          device_type: string | null
          device_vendor: string | null
          entry_pageview_id: string | null
          id: string
          ip_hash: string | null
          is_admin_page: boolean
          is_bot: boolean
          is_bounce: boolean | null
          language: string | null
          last_heartbeat_at: string | null
          os_name: string | null
          os_version: string | null
          page_path: string
          page_title: string | null
          page_url: string
          referrer: string | null
          referrer_host: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          total_seconds: number
          user_agent: string | null
          user_id: string | null
          visited_at: string
          visitor_id: string
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          city?: string | null
          country_code?: string | null
          device_type?: string | null
          device_vendor?: string | null
          entry_pageview_id?: string | null
          id?: string
          ip_hash?: string | null
          is_admin_page?: boolean
          is_bot?: boolean
          is_bounce?: boolean | null
          language?: string | null
          last_heartbeat_at?: string | null
          os_name?: string | null
          os_version?: string | null
          page_path: string
          page_title?: string | null
          page_url: string
          referrer?: string | null
          referrer_host?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          total_seconds?: number
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
          visitor_id: string
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          city?: string | null
          country_code?: string | null
          device_type?: string | null
          device_vendor?: string | null
          entry_pageview_id?: string | null
          id?: string
          ip_hash?: string | null
          is_admin_page?: boolean
          is_bot?: boolean
          is_bounce?: boolean | null
          language?: string | null
          last_heartbeat_at?: string | null
          os_name?: string | null
          os_version?: string | null
          page_path?: string
          page_title?: string | null
          page_url?: string
          referrer?: string | null
          referrer_host?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          total_seconds?: number
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_visitors: {
        Row: {
          city: string | null
          country_code: string | null
          distinct_sessions: number
          first_seen_at: string
          id: string
          is_member: boolean | null
          last_seen_at: string
          total_pageviews: number
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          distinct_sessions?: number
          first_seen_at?: string
          id: string
          is_member?: boolean | null
          last_seen_at?: string
          total_pageviews?: number
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          distinct_sessions?: number
          first_seen_at?: string
          id?: string
          is_member?: boolean | null
          last_seen_at?: string
          total_pageviews?: number
          user_id?: string | null
        }
        Relationships: []
      }
      site_visits_daily_summary: {
        Row: {
          avg_duration_seconds: number
          bot_pageviews: number
          bounce_rate: number
          browser_breakdown: Json
          country_breakdown: Json
          device_breakdown: Json
          hourly_distribution: Json
          member_pageviews: number
          referrer_breakdown: Json
          summary_date: string
          top_pages: Json
          total_pageviews: number
          unique_sessions: number
          unique_visitors: number
        }
        Insert: {
          avg_duration_seconds?: number
          bot_pageviews?: number
          bounce_rate?: number
          browser_breakdown?: Json
          country_breakdown?: Json
          device_breakdown?: Json
          hourly_distribution?: Json
          member_pageviews?: number
          referrer_breakdown?: Json
          summary_date: string
          top_pages?: Json
          total_pageviews?: number
          unique_sessions?: number
          unique_visitors?: number
        }
        Update: {
          avg_duration_seconds?: number
          bot_pageviews?: number
          bounce_rate?: number
          browser_breakdown?: Json
          country_breakdown?: Json
          device_breakdown?: Json
          hourly_distribution?: Json
          member_pageviews?: number
          referrer_breakdown?: Json
          summary_date?: string
          top_pages?: Json
          total_pageviews?: number
          unique_sessions?: number
          unique_visitors?: number
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          badge: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          link_url: string | null
          logo_url: string
          name: string
          order: number
        }
        Insert: {
          badge?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          link_url?: string | null
          logo_url: string
          name: string
          order?: number
        }
        Update: {
          badge?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          link_url?: string | null
          logo_url?: string
          name?: string
          order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stats: {
        Row: {
          count: number | null
          id: number
          stat_type: string
          updated_at: string | null
        }
        Insert: {
          count?: number | null
          id?: number
          stat_type: string
          updated_at?: string | null
        }
        Update: {
          count?: number | null
          id?: number
          stat_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          answer_boolean: boolean | null
          answer_date: string | null
          answer_datetime: string | null
          answer_json: Json | null
          answer_number: number | null
          answer_text: string | null
          answer_time: string | null
          answered_at: string
          id: number
          question_id: number
          response_id: number
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_date?: string | null
          answer_datetime?: string | null
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          answer_time?: string | null
          answered_at?: string
          id?: number
          question_id: number
          response_id: number
        }
        Update: {
          answer_boolean?: boolean | null
          answer_date?: string | null
          answer_datetime?: string | null
          answer_json?: Json | null
          answer_number?: number | null
          answer_text?: string | null
          answer_time?: string | null
          answered_at?: string
          id?: number
          question_id?: number
          response_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: number
          is_required: boolean
          options: Json | null
          question_description: string | null
          question_order: number
          question_text: string
          question_type: string
          survey_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_required?: boolean
          options?: Json | null
          question_description?: string | null
          question_order?: number
          question_text: string
          question_type: string
          survey_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_required?: boolean
          options?: Json | null
          question_description?: string | null
          question_order?: number
          question_text?: string
          question_type?: string
          survey_id?: number
          updated_at?: string
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
          completed_at: string | null
          created_at: string
          device_type: string | null
          id: number
          status: string
          survey_id: number
          time_spent_seconds: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          id?: number
          status?: string
          survey_id: number
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          id?: number
          status?: string
          survey_id?: number
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "members"
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
          access_type: string
          allow_anonymous: boolean
          allow_multiple_responses: boolean
          archived_at: string | null
          archived_by: string | null
          closed_at: string | null
          closed_message: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          id: number
          published_at: string | null
          show_progress_bar: boolean
          show_results_to_participants: boolean
          start_date: string | null
          status: string
          thank_you_message: string | null
          title: string
          total_views: number
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          access_type?: string
          allow_anonymous?: boolean
          allow_multiple_responses?: boolean
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          closed_message?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          published_at?: string | null
          show_progress_bar?: boolean
          show_results_to_participants?: boolean
          start_date?: string | null
          status?: string
          thank_you_message?: string | null
          title: string
          total_views?: number
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          access_type?: string
          allow_anonymous?: boolean
          allow_multiple_responses?: boolean
          archived_at?: string | null
          archived_by?: string | null
          closed_at?: string | null
          closed_message?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          published_at?: string | null
          show_progress_bar?: boolean
          show_results_to_participants?: boolean
          start_date?: string | null
          status?: string
          thank_you_message?: string | null
          title?: string
          total_views?: number
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          note: string | null
          selected_at: string | null
          source: string
          state: string
          submission: string | null
          submitted_at: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          note?: string | null
          selected_at?: string | null
          source?: string
          state?: string
          submission?: string | null
          submitted_at?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          note?: string | null
          selected_at?: string | null
          source?: string
          state?: string
          submission?: string | null
          submitted_at?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          committee_id: number | null
          created_at: string
          created_by: string
          description: string | null
          due_on: string | null
          id: string
          kind: string
          open_to_public_at: string | null
          slots: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          committee_id?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          due_on?: string | null
          id?: string
          kind?: string
          open_to_public_at?: string | null
          slots?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          committee_id?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_on?: string | null
          id?: string
          kind?: string
          open_to_public_at?: string | null
          slots?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          committee: string | null
          created_at: string | null
          id: string
          member_name: string
          rating: number | null
          text: string
          visible: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          committee?: string | null
          created_at?: string | null
          id?: string
          member_name: string
          rating?: number | null
          text: string
          visible?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          committee?: string | null
          created_at?: string | null
          id?: string
          member_name?: string
          rating?: number | null
          text?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          committee_id: number | null
          department_id: number | null
          ended_at: string | null
          id: number
          is_active: boolean
          notes: string | null
          role_name: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          committee_id?: number | null
          department_id?: number | null
          ended_at?: string | null
          id?: number
          is_active?: boolean
          notes?: string | null
          role_name: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          committee_id?: number | null
          department_id?: number | null
          ended_at?: string | null
          id?: number
          is_active?: boolean
          notes?: string | null
          role_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_specific_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_by: string | null
          id: number
          is_granted: boolean
          permission_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: number
          is_granted?: boolean
          permission_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: number
          is_granted?: boolean
          permission_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_specific_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          accepts_marketing: boolean
          city: string | null
          created_at: string
          email: string
          full_name: string
          gender: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          accepts_marketing?: boolean
          city?: string | null
          created_at?: string
          email: string
          full_name: string
          gender: string
          id: string
          phone: string
          updated_at?: string
        }
        Update: {
          accepts_marketing?: boolean
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gender?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_applications: {
        Row: {
          admin_note: string | null
          applied_at: string
          attendance: string | null
          attendance_at: string | null
          attendance_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          denial_reason: string | null
          deserves_certificate: boolean | null
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          opportunity_id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          applied_at?: string
          attendance?: string | null
          attendance_at?: string | null
          attendance_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          denial_reason?: string | null
          deserves_certificate?: boolean | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          opportunity_id: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          applied_at?: string
          attendance?: string | null
          attendance_at?: string | null
          attendance_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          denial_reason?: string | null
          deserves_certificate?: boolean | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          opportunity_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_applications_attendance_by_fkey"
            columns: ["attendance_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_attendance_by_fkey"
            columns: ["attendance_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteer_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      volunteer_opportunities: {
        Row: {
          closed_at: string | null
          committee_id: number | null
          created_at: string
          created_by: string
          description: string
          duration_note: string | null
          ends_on: string | null
          id: string
          location: string | null
          opened_at: string | null
          seats: number | null
          starts_on: string | null
          status: string
          target_gender: string | null
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          committee_id?: number | null
          created_at?: string
          created_by: string
          description: string
          duration_note?: string | null
          ends_on?: string | null
          id?: string
          location?: string | null
          opened_at?: string | null
          seats?: number | null
          starts_on?: string | null
          status?: string
          target_gender?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          committee_id?: number | null
          created_at?: string
          created_by?: string
          description?: string
          duration_note?: string | null
          ends_on?: string | null
          id?: string
          location?: string | null
          opened_at?: string | null
          seats?: number | null
          starts_on?: string | null
          status?: string
          target_gender?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_opportunities_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_preferences: {
        Row: {
          committee_id: number
          rank: number
          updated_at: string
          user_id: string
        }
        Insert: {
          committee_id: number
          rank: number
          updated_at?: string
          user_id: string
        }
        Update: {
          committee_id?: number
          rank?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_preferences_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      volunteers: {
        Row: {
          applied_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_preview_cards: {
        Row: {
          cycles: number
          last_fetch_at: string | null
          last_fetch_note: string | null
          points: number
          redemptions: number
          serial: string
          stamps: number
          updated_at: string
        }
        Insert: {
          cycles?: number
          last_fetch_at?: string | null
          last_fetch_note?: string | null
          points?: number
          redemptions?: number
          serial: string
          stamps?: number
          updated_at?: string
        }
        Update: {
          cycles?: number
          last_fetch_at?: string | null
          last_fetch_note?: string | null
          points?: number
          redemptions?: number
          serial?: string
          stamps?: number
          updated_at?: string
        }
        Relationships: []
      }
      wallet_preview_devices: {
        Row: {
          created_at: string
          device_id: string
          last_poll_at: string | null
          push_token: string
          serial: string
        }
        Insert: {
          created_at?: string
          device_id: string
          last_poll_at?: string | null
          push_token: string
          serial: string
        }
        Update: {
          created_at?: string
          device_id?: string
          last_poll_at?: string | null
          push_token?: string
          serial?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_preview_devices_serial_fkey"
            columns: ["serial"]
            isOneToOne: false
            referencedRelation: "wallet_preview_cards"
            referencedColumns: ["serial"]
          },
        ]
      }
      wallet_preview_log: {
        Row: {
          at: string
          id: number
          line: string
        }
        Insert: {
          at?: string
          id?: number
          line: string
        }
        Update: {
          at?: string
          id?: number
          line?: string
        }
        Relationships: []
      }
      works: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          link_url: string | null
          order: number
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          order?: number
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      members: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          joined_date: string | null
          phone: string | null
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          joined_date?: string | null
          phone?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          joined_date?: string | null
          phone?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _apply_termination: {
        Args: {
          p_actor: string
          p_reason: string
          p_source: string
          p_user: string
        }
        Returns: undefined
      }
      _cancel_election_apply: {
        Args: { p_election: string; p_event: string; p_reason: string }
        Returns: undefined
      }
      _choice_weight: {
        Args: { p_choice: string; p_election: string }
        Returns: number
      }
      _count_active_candidates: {
        Args: { p_election: string }
        Returns: number
      }
      _count_approved_candidates: {
        Args: { p_election: string }
        Returns: number
      }
      _election_target_label: {
        Args: { p_election_id: string }
        Returns: string
      }
      _finalize_confidence: { Args: { p_election: string }; Returns: boolean }
      _send_election_notification: {
        Args: {
          p_audience: string
          p_election_id: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type?: string
          p_user_ids?: string[]
        }
        Returns: number
      }
      accept_aspirant: {
        Args: { p_role?: string; p_user: string }
        Returns: Json
      }
      admin_cancel_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: boolean
      }
      admin_force_close_candidacy: {
        Args: { p_election: string; p_reason: string }
        Returns: undefined
      }
      aggregate_yesterday_into_summary: { Args: never; Returns: undefined }
      apply_for_membership: { Args: never; Returns: undefined }
      apply_for_opportunity: {
        Args: { p_opportunity_id: string }
        Returns: string
      }
      apply_for_volunteering: {
        Args: { p_prefs: number[] }
        Returns: undefined
      }
      appoint_to_seat: {
        Args: { p_election: string; p_reason: string; p_user: string }
        Returns: undefined
      }
      archive_election: { Args: { p_election: string }; Returns: undefined }
      assign_position: {
        Args: {
          p_actor: string
          p_committee?: number
          p_department?: number
          p_notes?: string
          p_replace?: boolean
          p_role_name?: string
          p_user: string
        }
        Returns: Json
      }
      assign_supervision: {
        Args: {
          p_actor: string
          p_committee: number
          p_notes?: string
          p_replace?: boolean
          p_unit?: number
          p_user: string
        }
        Returns: Json
      }
      assign_task: {
        Args: { p_task: string; p_user: string }
        Returns: undefined
      }
      assignable_members: {
        Args: { p_actor: string; p_role_name?: string }
        Returns: string[]
      }
      badge_awards: {
        Args: never
        Returns: {
          badge_id: string
          earned_at: string
          evidence: string
          user_id: string
        }[]
      }
      book_activity_seat: { Args: { p_activity_id: string }; Returns: string }
      bump_episode_like: {
        Args: { p_episode: string; p_up: boolean }
        Returns: number
      }
      bump_episode_play: {
        Args: { p_device?: string; p_episode: string; p_plain?: boolean }
        Returns: undefined
      }
      calculate_average_rating: {
        Args: { p_question_id: number }
        Returns: number
      }
      calculate_nps_score: {
        Args: { p_question_id: number; p_survey_id: number }
        Returns: number
      }
      can_assign_role: {
        Args: { p_actor: string; p_committee: number; p_role_name: string }
        Returns: boolean
      }
      can_change_name: { Args: { p_user_id: string }; Returns: boolean }
      can_edit_member_data: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_end_membership: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_issue_certificate: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_issue_warning: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_manage_site_visits: { Args: { p_user_id: string }; Returns: boolean }
      can_manage_tasks_of: {
        Args: { p_actor: string; p_committee: number }
        Returns: boolean
      }
      can_open_newsroom: { Args: { p_actor: string }; Returns: boolean }
      can_take_position_from: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_view_certificate_of: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_view_site_visits: { Args: { p_user_id: string }; Returns: boolean }
      can_view_warnings_of: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      can_voter_read_election_file: {
        Args: { p_obj_name: string; p_user: string }
        Returns: boolean
      }
      cancel_activity_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: boolean
      }
      cancel_election: {
        Args: { p_election: string; p_reason?: string }
        Returns: string[]
      }
      cancel_warning: {
        Args: { p_actor: string; p_reason: string; p_warning: string }
        Returns: Json
      }
      cast_vote: {
        Args: { p_candidate: string; p_choice?: string; p_election: string }
        Returns: string
      }
      certificate_targets: {
        Args: { p_actor: string }
        Returns: {
          account_status: string
          avatar: string
          gender: string
          issued_count: number
          joined_date: string
          name: string
          phone: string
          position_title: string
          suggested_name: string
          user_id: string
        }[]
      }
      certificates_for_reader: {
        Args: { p_actor: string }
        Returns: {
          created_at: string
          holder_name: string
          id: string
          issuer_name: string
          may_manage: boolean
          member_avatar: string
          member_gender: string
          member_name: string
          member_phone: string
          member_status: string
          period_from: string
          period_to: string
          position_title: string
          revoke_reason: string
          revoked_at: string
          revoker_name: string
          serial: string
          status: string
          user_id: string
        }[]
      }
      check_any_permission: {
        Args: {
          p_permission_keys: string[]
          p_scope?: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_permission: {
        Args: {
          p_context?: Json
          p_permission_key: string
          p_scope?: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_user_permission:
        | {
            Args: { p_permission_key: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: { action_type: string; perm_name: string; user_uuid: string }
            Returns: boolean
          }
      cleanup_pageviews_older_than: {
        Args: { p_days?: number }
        Returns: number
      }
      confirm_user_email: { Args: { user_id: string }; Returns: undefined }
      confirm_whatsapp: { Args: { p_reservation_id: string }; Returns: boolean }
      count_user_election_tabs: {
        Args: { p_user?: string }
        Returns: {
          can_run: number
          can_view: number
          can_vote: number
          has_submission: number
        }[]
      }
      create_my_account_profile: {
        Args: {
          p_accepts_marketing?: boolean
          p_city?: string
          p_full_name: string
          p_gender: string
          p_phone: string
        }
        Returns: undefined
      }
      create_open_call: {
        Args: {
          p_aspirant_days: number
          p_committee: number
          p_description: string
          p_due_on: string
          p_slots: number
          p_title: string
        }
        Returns: string
      }
      create_task: {
        Args: {
          p_committee: number
          p_description: string
          p_due_on: string
          p_title: string
        }
        Returns: string
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      decide_volunteer_application: {
        Args: { p_accept: boolean; p_id: string; p_reason?: string }
        Returns: Json
      }
      declare_winner: {
        Args: { p_candidate: string; p_election: string }
        Returns: undefined
      }
      declare_winner_apply: {
        Args: { p_candidate: string; p_election: string }
        Returns: undefined
      }
      department_resolution_state: {
        Args: { p_election: string }
        Returns: Json
      }
      election_department: { Args: { p_election: string }; Returns: number }
      end_volunteering: {
        Args: { p_reason: string; p_user: string }
        Returns: Json
      }
      evaluate_volunteer: {
        Args: {
          p_admin_note?: string
          p_denial_reason?: string
          p_deserves: boolean
          p_id: string
        }
        Returns: Json
      }
      export_visits_for_admin: {
        Args: { end_date: string; start_date: string }
        Returns: {
          browser_name: string
          city: string
          country_code: string
          country_name: string
          device_type: string
          is_bounce: boolean
          os_name: string
          page_path: string
          page_title: string
          referrer_host: string
          total_seconds: number
          visited_at: string
        }[]
      }
      generate_certificate_serial: {
        Args: { p_activity_date: string }
        Returns: string
      }
      generate_profile_slug: {
        Args: { full_name: string; p_user_id: string }
        Returns: string
      }
      generate_public_slug: {
        Args: { p_name: string; p_user_id: string }
        Returns: string
      }
      get_active_attendance_windows: {
        Args: never
        Returns: {
          activity_date: string
          confirmed_count: number
          end_time: string
          id: string
          location: string
          name: string
          start_time: string
        }[]
      }
      get_activity_attendance_list: {
        Args: { p_activity_id: string }
        Returns: {
          account_type: string
          attendance_status: string
          attended_at: string
          full_name: string
          gender: string
          phone: string
          reservation_id: string
          whatsapp_confirmed_at: string
        }[]
      }
      get_activity_full_details: {
        Args: { p_activity_id: string }
        Returns: Json
      }
      get_activity_seat_status: {
        Args: { p_activity_id: string }
        Returns: {
          activity_id: string
          female_booked: number
          female_remaining: number
          female_seats: number
          male_booked: number
          male_remaining: number
          male_seats: number
          total_booked: number
          total_remaining: number
          total_seats: number
        }[]
      }
      get_anonymized_candidates: {
        Args: { p_election: string }
        Returns: {
          candidate_id: string
          candidate_number: number
          file_mime: string
          file_name: string
          file_size_bytes: number
          file_url: string
          is_self: boolean
          statement_ar: string
        }[]
      }
      get_board_members: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          gender: string
          id: string
          linkedin_account: string
          public_slug: string
          role_ar: string
          twitter_account: string
          unit_name: string
        }[]
      }
      get_browser_stats: {
        Args: { days_back?: number }
        Returns: {
          browser_name: string
          percentage: number
          visit_count: number
        }[]
      }
      get_candidate_audit_trail: {
        Args: { p_candidate: string }
        Returns: {
          actor_name: string
          created_at: string
          event_type: string
          payload: Json
        }[]
      }
      get_candidates_with_identity: {
        Args: { p_election: string }
        Returns: {
          avatar_url: string
          candidate_id: string
          candidate_number: number
          file_mime: string
          file_name: string
          file_size_bytes: number
          file_url: string
          full_name: string
          review_note_ar: string
          reviewed_at: string
          reviewed_by: string
          statement_ar: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          username: string
          withdrawn_at: string
        }[]
      }
      get_certificate_data: {
        Args: { p_serial: string }
        Returns: {
          activity_date: string
          activity_name: string
          activity_type: string
          holder_gender: string
          holder_name: string
          issued_at: string
        }[]
      }
      get_cities_stats: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          city: string
          country_code: string
          country_name: string
          unique_visitors: number
          visit_count: number
        }[]
      }
      get_completed_writers_count: {
        Args: { p_news_id: string }
        Returns: number
      }
      get_countries_stats: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          country_code: string
          country_name: string
          unique_visitors: number
          visit_count: number
        }[]
      }
      get_device_stats: {
        Args: { days_back?: number }
        Returns: {
          device_type: string
          unique_visitors: number
          visit_count: number
        }[]
      }
      get_download_stats: {
        Args: { p_file_key: string }
        Returns: {
          last_download: string
          this_week_downloads: number
          today_downloads: number
          total_downloads: number
        }[]
      }
      get_election_audit_log: {
        Args: { p_election: string }
        Returns: {
          actor_id: string
          actor_name: string
          created_at: string
          event_type: string
          id: number
          payload: Json
        }[]
      }
      get_election_results: {
        Args: { p_election: string }
        Returns: {
          avatar_url: string
          candidate_id: string
          candidate_number: number
          full_name: string
          is_winner: boolean
          total_votes: number
          total_weight: number
          user_id: string
        }[]
      }
      get_election_vote_detail: {
        Args: { p_election: string }
        Returns: {
          candidate_id: string
          candidate_name: string
          candidate_number: number
          vote_choice: string
          vote_weight: number
          voted_at: string
          voter_id: string
          voter_name: string
          voter_role: string
        }[]
      }
      get_election_voters_participation: {
        Args: { p_election: string }
        Returns: {
          full_name: string
          has_voted: boolean
          role_name: string
          user_id: string
          vote_weight: number
          voted_at: string
        }[]
      }
      get_eligible_elections_for_user: {
        Args: { p_user?: string }
        Returns: {
          candidacy_end: string
          election_id: string
          has_submission: boolean
          target_committee_ar: string
          target_committee_id: number
          target_department_ar: string
          target_department_id: number
          target_role_name: string
        }[]
      }
      get_ended_activities_with_seats: {
        Args: { p_limit?: number }
        Returns: {
          activity_date: string
          activity_type: string
          cover_image_url: string
          description: string
          end_time: string
          female_remaining: number
          female_seats: number
          id: string
          is_cancelled: boolean
          location: string
          male_remaining: number
          male_seats: number
          name: string
          start_time: string
        }[]
      }
      get_exit_pages: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          exit_count: number
          page_path: string
          page_title: string
        }[]
      }
      get_member_election_signals: {
        Args: { p_user?: string }
        Returns: {
          can_run: boolean
          can_vote: boolean
          has_candidacy: boolean
        }[]
      }
      get_month_visits_stats: {
        Args: never
        Returns: {
          total_visits: number
          unique_visitors: number
        }[]
      }
      get_new_vs_returning: {
        Args: { days_back?: number }
        Returns: {
          new_visitors: number
          returning_visitors: number
          visit_date: string
        }[]
      }
      get_occupied_positions: {
        Args: never
        Returns: {
          committee_id: number
          department_id: number
          role_name: string
        }[]
      }
      get_option_distribution: {
        Args: { p_question_id: number }
        Returns: {
          count: number
          option_value: string
          percentage: number
        }[]
      }
      get_public_profile: { Args: { p_slug: string }; Returns: Json }
      get_published_activities_with_seats: {
        Args: never
        Returns: {
          activity_date: string
          activity_type: string
          cover_image_url: string
          description: string
          end_time: string
          female_remaining: number
          female_seats: number
          id: string
          is_cancelled: boolean
          location: string
          male_remaining: number
          male_seats: number
          name: string
          start_time: string
          target_gender: string
          total_remaining: number
          total_seats: number
        }[]
      }
      get_question_results: {
        Args: { p_question_id: number }
        Returns: {
          question_text: string
          question_type: string
          results: Json
          total_answers: number
        }[]
      }
      get_server_time: { Args: never; Returns: string }
      get_today_visits_stats: {
        Args: never
        Returns: {
          total_visits: number
          unique_visitors: number
        }[]
      }
      get_top_pages: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          avg_duration: number
          page_path: string
          page_title: string
          unique_visitors: number
          visit_count: number
        }[]
      }
      get_top_referrers: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          referrer_host: string
          unique_visitors: number
          visit_count: number
        }[]
      }
      get_total_writers_count: { Args: { p_news_id: string }; Returns: number }
      get_unread_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_all_permissions: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          permission_key: string
          permission_name_ar: string
          source: string
        }[]
      }
      get_user_candidacies: {
        Args: { p_user?: string }
        Returns: {
          can_edit: boolean
          can_withdraw: boolean
          candidacy_end: string
          candidate_id: string
          candidate_number: number
          candidate_status: string
          election_archived_at: string
          election_id: string
          election_status: string
          file_name: string
          file_url: string
          review_note_ar: string
          reviewed_at: string
          statement_ar: string
          submitted_at: string
          target_committee_ar: string
          target_committee_id: number
          target_department_ar: string
          target_department_id: number
          target_role_name: string
        }[]
      }
      get_user_notifications: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          action_label: string
          action_url: string
          created_at: string
          icon: string
          id: number
          is_read: boolean
          message: string
          priority: string
          title: string
          type: string
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          category: string
          permission_key: string
          permission_name_ar: string
        }[]
      }
      get_user_permissions_by_module: {
        Args: { p_module: string; p_user_id: string }
        Returns: {
          permission_key: string
          permission_name_ar: string
          scope: string
          source: string
        }[]
      }
      get_user_primary_role: { Args: { p_user: string }; Returns: string }
      get_visit_stats: {
        Args: { end_date: string; start_date: string }
        Returns: {
          avg_duration: number
          bounce_rate: number
          member_visits: number
          pages_per_session: number
          total_visits: number
          unique_sessions: number
          unique_visitors: number
        }[]
      }
      get_visitor_analytics: { Args: { p_days?: number }; Returns: Json }
      get_visits_by_day: {
        Args: { days_back?: number }
        Returns: {
          avg_duration: number
          sessions: number
          total_visits: number
          unique_visitors: number
          visit_date: string
        }[]
      }
      get_visits_heatmap: {
        Args: { days_back?: number }
        Returns: {
          day_of_week: number
          hour_of_day: number
          visit_count: number
        }[]
      }
      get_votable_elections_for_user: {
        Args: { p_user?: string }
        Returns: {
          election_id: string
          has_voted: boolean
          target_committee_ar: string
          target_committee_id: number
          target_department_ar: string
          target_department_id: number
          target_role_name: string
          view_only: boolean
          voting_end: string
        }[]
      }
      get_vote_weight: { Args: { p_user: string }; Returns: number }
      get_week_visits_stats: {
        Args: never
        Returns: {
          total_visits: number
          unique_visitors: number
        }[]
      }
      grant_membership_to_volunteer: {
        Args: { p_committee_id: number; p_user: string }
        Returns: Json
      }
      grant_user_specific_permission: {
        Args: {
          p_expires_at?: string
          p_granted_by?: string
          p_is_granted?: boolean
          p_notes?: string
          p_permission_key: string
          p_scope?: string
          p_user_id: string
        }
        Returns: boolean
      }
      gw_close_session: { Args: { p_session_id: string }; Returns: undefined }
      gw_create_session: {
        Args: { p_time_per_word?: number; p_title: string; p_words: string[] }
        Returns: {
          code: string
          created_at: string
          created_by: string
          current_word_id: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string
          time_per_word: number
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guess_word_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gw_delete_session: { Args: { p_session_id: string }; Returns: undefined }
      gw_end_current_round: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      gw_generate_session_code: { Args: never; Returns: string }
      gw_get_admin_session_data: {
        Args: { p_session_id: string }
        Returns: Json
      }
      gw_get_leaderboard: {
        Args: { p_session_id: string }
        Returns: {
          name: string
          player_id: string
          rank: number
          score: number
        }[]
      }
      gw_get_player_state: { Args: { p_token: string }; Returns: Json }
      gw_is_admin: { Args: { p_user_id: string }; Returns: boolean }
      gw_join_session: {
        Args: { p_code: string; p_name: string; p_token: string }
        Returns: Json
      }
      gw_kick_player: { Args: { p_player_id: string }; Returns: undefined }
      gw_list_admin_sessions: {
        Args: never
        Returns: {
          code: string
          created_at: string
          finished_at: string
          id: string
          players_count: number
          started_at: string
          status: string
          time_per_word: number
          title: string
          words_count: number
        }[]
      }
      gw_pick_winner: {
        Args: { p_player_id: string; p_word_id: string }
        Returns: undefined
      }
      gw_start_next_round: {
        Args: { p_session_id: string }
        Returns: {
          ended_at: string | null
          id: string
          position: number
          session_id: string
          started_at: string | null
          winner_player_id: string | null
          word: string
        }
        SetofOptions: {
          from: "*"
          to: "guess_word_words"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gw_submit_answer: {
        Args: { p_answer: string; p_token: string }
        Returns: {
          answer: string
          id: string
          player_id: string
          response_ms: number
          submitted_at: string
          word_id: string
        }
        SetofOptions: {
          from: "*"
          to: "guess_word_answers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_election_admin_permission: {
        Args: { p_user: string }
        Returns: boolean
      }
      has_election_view_permission: {
        Args: { p_election: string; p_user: string }
        Returns: boolean
      }
      hook_block_oauth_signup: { Args: { event: Json }; Returns: Json }
      increment_stat: { Args: { p_stat_type: string }; Returns: number }
      increment_survey_views: {
        Args: { survey_id: number }
        Returns: undefined
      }
      is_active_volunteer: { Args: { p_user: string }; Returns: boolean }
      is_adeeb_member: { Args: { p_user: string }; Returns: boolean }
      is_arabic_name: { Args: { p_name: string }; Returns: boolean }
      is_committee_member: {
        Args: { p_committee_id: number }
        Returns: boolean
      }
      is_confidence_election: { Args: { p_election: string }; Returns: boolean }
      is_my_task: { Args: { p_task: string }; Returns: boolean }
      is_sole_candidate: {
        Args: { p_election: string; p_user: string }
        Returns: boolean
      }
      is_target_position_vacant: {
        Args: {
          p_committee_id: number
          p_department_id: number
          p_role_name: string
        }
        Returns: boolean
      }
      is_top_admin_role: { Args: { p_user: string }; Returns: boolean }
      is_user_eligible_to_run: {
        Args: { p_election: string; p_user: string }
        Returns: boolean
      }
      is_user_eligible_to_vote: {
        Args: { p_election: string; p_user: string }
        Returns: boolean
      }
      issue_certificate: {
        Args: {
          p_actor: string
          p_name?: string
          p_position?: string
          p_user: string
        }
        Returns: Json
      }
      issue_participation_certificate: {
        Args: { p_application_id: string }
        Returns: Json
      }
      issue_warning: {
        Args: {
          p_actor: string
          p_category: string
          p_committee?: number
          p_occurred?: string
          p_reason: string
          p_user: string
        }
        Returns: Json
      }
      library_increment_views: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      library_reorder_pages: {
        Args: { p_book_id: string; p_page_ids: string[] }
        Returns: undefined
      }
      list_certificates_for_send: { Args: never; Returns: Json }
      log_activity:
        | {
            Args: {
              p_action_type: string
              p_details?: Json
              p_resource_id?: string
              p_resource_type?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action_type: string
              p_details?: Json
              p_ip_address?: string
              p_target_id: string
              p_target_type: string
              p_user_id: string
            }
            Returns: undefined
          }
      log_file_download: {
        Args: {
          p_file_key: string
          p_file_name: string
          p_ip_hash?: string
          p_user_agent?: string
        }
        Returns: number
      }
      log_news_activity: {
        Args: { p_action: string; p_details?: Json; p_news_id: string }
        Returns: string
      }
      lookup_auth_user_by_email: { Args: { p_email: string }; Returns: Json }
      mark_attendance: {
        Args: { p_reservation_id: string; p_status: string }
        Returns: string
      }
      mark_certificate_sent: {
        Args: { p_reservation_id: string }
        Returns: boolean
      }
      mark_task: {
        Args: { p_assignment: string; p_note: string; p_state: string }
        Returns: undefined
      }
      mark_volunteer_attendance: {
        Args: { p_attendance: string; p_id: string }
        Returns: Json
      }
      may_see_open_call: { Args: { p_task: string }; Returns: boolean }
      member_within_reach: {
        Args: { p_actor: string; p_target: string }
        Returns: boolean
      }
      members_i_may_certify: {
        Args: { p_actor: string }
        Returns: {
          user_id: string
        }[]
      }
      members_i_may_warn: {
        Args: { p_actor: string }
        Returns: {
          active_count: number
          avatar: string
          committee_id: number
          committee_name: string
          gender: string
          joined_date: string
          name: string
          phone: string
          role_ar: string
          user_id: string
        }[]
      }
      members_in_my_reach: {
        Args: { p_actor: string }
        Returns: {
          may_edit: boolean
          may_end: boolean
          user_id: string
        }[]
      }
      my_public_slug: { Args: never; Returns: string }
      my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          last_seen: string
          user_agent: string
        }[]
      }
      news_assign_writers: {
        Args: {
          p_actor: string
          p_fields?: Json
          p_news: string
          p_notes?: string
          p_writers: string[]
        }
        Returns: string
      }
      news_bump_views: { Args: { p_news: string }; Returns: undefined }
      news_comment: {
        Args: {
          p_actor: string
          p_news: string
          p_parent?: string
          p_text: string
        }
        Returns: string
      }
      news_create: {
        Args: {
          p_actor: string
          p_category?: string
          p_committee?: number
          p_title: string
        }
        Returns: string
      }
      news_log: {
        Args: {
          p_action: string
          p_actor: string
          p_details?: Json
          p_news: string
        }
        Returns: undefined
      }
      news_return_for_edits: {
        Args: { p_actor: string; p_news: string; p_notes: string }
        Returns: string
      }
      news_role: { Args: { p_actor: string; p_news: string }; Returns: string }
      news_set_status: {
        Args: { p_actor: string; p_news: string; p_op: string }
        Returns: string
      }
      news_submit_for_review: {
        Args: { p_actor: string; p_news: string }
        Returns: string
      }
      news_writer_touch: {
        Args: { p_actor: string; p_news: string }
        Returns: undefined
      }
      normalize_phone: { Args: { p_phone: string }; Returns: string }
      position_title_of: { Args: { p_user: string }; Returns: string }
      recommend_aspirant: {
        Args: { p_note: string; p_user: string }
        Returns: undefined
      }
      resolve_department_election_winners: {
        Args: { p_department: number }
        Returns: Json
      }
      restore_candidacy: { Args: { p_candidate: string }; Returns: undefined }
      restore_membership: {
        Args: { p_actor: string; p_user: string }
        Returns: Json
      }
      resubmit_candidacy: {
        Args: {
          p_candidate: string
          p_file_mime?: string
          p_file_name?: string
          p_file_size_bytes?: number
          p_file_url?: string
          p_statement_ar: string
        }
        Returns: undefined
      }
      review_candidate: {
        Args: { p_candidate: string; p_new_status: string; p_note_ar?: string }
        Returns: undefined
      }
      revoke_certificate: {
        Args: { p_actor: string; p_id: string; p_reason: string }
        Returns: Json
      }
      revoke_participation_certificate: {
        Args: { p_id: string; p_reason: string }
        Returns: Json
      }
      revoke_position: {
        Args: {
          p_actor: string
          p_committee?: number
          p_role_name: string
          p_user: string
        }
        Returns: Json
      }
      revoke_supervision: {
        Args: {
          p_actor: string
          p_committee: number
          p_unit?: number
          p_user: string
        }
        Returns: Json
      }
      seat_declared_by_unit: {
        Args: { p_committee: number; p_role_name: string }
        Returns: boolean
      }
      select_volunteer: {
        Args: { p_assignment: string; p_selected: boolean }
        Returns: undefined
      }
      set_my_volunteer_preferences: {
        Args: { p_prefs: number[] }
        Returns: undefined
      }
      set_seat_preference: {
        Args: { p_department: number; p_preferred_election: string }
        Returns: undefined
      }
      set_task_status: {
        Args: { p_status: string; p_task: string }
        Returns: undefined
      }
      submit_candidacy: {
        Args: {
          p_election: string
          p_file_mime?: string
          p_file_name?: string
          p_file_size_bytes?: number
          p_file_url?: string
          p_statement_ar: string
        }
        Returns: string
      }
      submit_survey_response: {
        Args: {
          p_answers: Json
          p_device_type?: string
          p_survey_id: number
          p_time_spent_seconds?: number
          p_user_id: string
        }
        Returns: number
      }
      submit_task: {
        Args: { p_assignment: string; p_submission: string }
        Returns: undefined
      }
      survey_is_active_member: { Args: { p_user: string }; Returns: boolean }
      sweep_election_deadlines: {
        Args: never
        Returns: {
          closed_candidacy: number
          closed_voting: number
        }[]
      }
      sweep_radio_schedule: { Args: never; Returns: number }
      sweep_survey_deadlines: { Args: never; Returns: number }
      sync_badges: { Args: never; Returns: number }
      task_committee: { Args: { p_task: string }; Returns: number }
      task_committees_of: { Args: { p_actor: string }; Returns: number[] }
      terminate_membership: {
        Args: { p_actor: string; p_reason: string; p_user: string }
        Returns: Json
      }
      toggle_news_like: {
        Args: {
          p_guest_identifier?: string
          p_news_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      transition_election: {
        Args: {
          p_election: string
          p_new_status: string
          p_voting_end?: string
        }
        Returns: undefined
      }
      unassign_task: {
        Args: { p_task: string; p_user: string }
        Returns: undefined
      }
      update_member_email: {
        Args: { p_new_email: string; p_user_id: string }
        Returns: Json
      }
      update_member_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      update_task: {
        Args: {
          p_description: string
          p_due_on: string
          p_task: string
          p_title: string
        }
        Returns: undefined
      }
      verify_certificate: { Args: { p_serial: string }; Returns: Json }
      volunteer_committee_options: {
        Args: never
        Returns: {
          description: string
          id: number
          name: string
        }[]
      }
      volunteer_for_call: { Args: { p_task: string }; Returns: undefined }
      warning_limit: { Args: never; Returns: number }
      warnings_for_reader: {
        Args: { p_actor: string }
        Returns: {
          active_count: number
          cancel_reason: string
          cancelled_at: string
          canceller_name: string
          category: string
          caused_termination: boolean
          committee_id: number
          committee_name: string
          created_at: string
          id: string
          issuer_name: string
          may_manage: boolean
          member_avatar: string
          member_gender: string
          member_name: string
          member_phone: string
          member_status: string
          occurred_on: string
          ordinal: number
          reason: string
          role_ar: string
          role_at_issue: string
          status: string
          user_id: string
        }[]
      }
      withdraw_application: { Args: never; Returns: undefined }
      withdraw_candidacy: { Args: { p_candidate: string }; Returns: undefined }
      withdraw_my_application: { Args: { p_id: string }; Returns: undefined }
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
