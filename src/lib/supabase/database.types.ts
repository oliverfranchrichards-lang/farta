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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_complement: string | null
          address_line: string
          address_number: string
          city: string
          created_at: string
          district: string
          establishment_id: string
          id: string
          is_default: boolean
          label: string
          postal_code: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          address_complement?: string | null
          address_line: string
          address_number: string
          city: string
          created_at?: string
          district: string
          establishment_id: string
          id?: string
          is_default?: boolean
          label: string
          postal_code: string
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_complement?: string | null
          address_line?: string
          address_number?: string
          city?: string
          created_at?: string
          district?: string
          establishment_id?: string
          id?: string
          is_default?: boolean
          label?: string
          postal_code?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          actor_role: string | null
          company_id: string | null
          correlation_id: string | null
          created_at: string
          id: string
          metadata: Json
          outcome: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          actor_role?: string | null
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          outcome: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          actor_role?: string | null
          company_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          outcome?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          displayed_unit_price_minor: number | null
          id: string
          quantity: number
          sku_id: string
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          displayed_unit_price_minor?: number | null
          id?: string
          quantity: number
          sku_id: string
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          displayed_unit_price_minor?: number | null
          id?: string
          quantity?: number
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          company_id: string
          created_at: string
          created_by_profile_id: string
          establishment_id: string
          id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_profile_id: string
          establishment_id: string
          id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_profile_id?: string
          establishment_id?: string
          id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "carts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_created_by_profile_id_company_id_fkey"
            columns: ["created_by_profile_id", "company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "carts_establishment_id_company_id_fkey"
            columns: ["establishment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          corporate_email: string | null
          corporate_phone: string | null
          created_at: string
          credit_limit_minor: number | null
          display_name: string
          fiscal_address_complement: string | null
          fiscal_address_line: string | null
          fiscal_address_number: string | null
          fiscal_city: string | null
          fiscal_district: string | null
          fiscal_postal_code: string | null
          fiscal_state: string | null
          id: string
          legal_name: string
          legal_representative_email: string | null
          legal_representative_name: string | null
          legal_representative_phone: string | null
          operational_contact_email: string | null
          operational_contact_name: string | null
          operational_contact_phone: string | null
          payment_terms_days: number | null
          state_registration: string | null
          status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          corporate_email?: string | null
          corporate_phone?: string | null
          created_at?: string
          credit_limit_minor?: number | null
          display_name: string
          fiscal_address_complement?: string | null
          fiscal_address_line?: string | null
          fiscal_address_number?: string | null
          fiscal_city?: string | null
          fiscal_district?: string | null
          fiscal_postal_code?: string | null
          fiscal_state?: string | null
          id?: string
          legal_name: string
          legal_representative_email?: string | null
          legal_representative_name?: string | null
          legal_representative_phone?: string | null
          operational_contact_email?: string | null
          operational_contact_name?: string | null
          operational_contact_phone?: string | null
          payment_terms_days?: number | null
          state_registration?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          corporate_email?: string | null
          corporate_phone?: string | null
          created_at?: string
          credit_limit_minor?: number | null
          display_name?: string
          fiscal_address_complement?: string | null
          fiscal_address_line?: string | null
          fiscal_address_number?: string | null
          fiscal_city?: string | null
          fiscal_district?: string | null
          fiscal_postal_code?: string | null
          fiscal_state?: string | null
          id?: string
          legal_name?: string
          legal_representative_email?: string | null
          legal_representative_name?: string | null
          legal_representative_phone?: string | null
          operational_contact_email?: string | null
          operational_contact_name?: string | null
          operational_contact_phone?: string | null
          payment_terms_days?: number | null
          state_registration?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_profile_id: string | null
          company_id: string
          created_at: string
          created_by_profile_id: string
          expires_at: string
          id: string
          invited_email: string
          invited_role: string
          revoked_at: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_profile_id?: string | null
          company_id: string
          created_at?: string
          created_by_profile_id: string
          expires_at: string
          id?: string
          invited_email: string
          invited_role?: string
          revoked_at?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_profile_id?: string | null
          company_id?: string
          created_at?: string
          created_by_profile_id?: string
          expires_at?: string
          id?: string
          invited_email?: string
          invited_role?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_accepted_by_profile_id_fkey"
            columns: ["accepted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          granted_by_profile_id: string | null
          id: string
          profile_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted_by_profile_id?: string | null
          id?: string
          profile_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted_by_profile_id?: string | null
          id?: string
          profile_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_granted_by_profile_id_fkey"
            columns: ["granted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_profile_id_company_id_fkey"
            columns: ["profile_id", "company_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      deliveries: {
        Row: {
          address_snapshot: Json
          created_at: string
          delivered_at: string | null
          delivery_completed_event_id: string | null
          delivery_window: Json | null
          id: string
          order_id: string
          recipient_name: string
          status: string
          updated_at: string
        }
        Insert: {
          address_snapshot: Json
          created_at?: string
          delivered_at?: string | null
          delivery_completed_event_id?: string | null
          delivery_window?: Json | null
          id?: string
          order_id: string
          recipient_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          created_at?: string
          delivered_at?: string | null
          delivery_completed_event_id?: string | null
          delivery_window?: Json | null
          id?: string
          order_id?: string
          recipient_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_driver_assignments: {
        Row: {
          assigned_at: string
          assigned_by_profile_id: string | null
          delivery_id: string
          driver_profile_id: string
          id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by_profile_id?: string | null
          delivery_id: string
          driver_profile_id: string
          id?: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by_profile_id?: string | null
          delivery_id?: string
          driver_profile_id?: string
          id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_driver_assignments_assigned_by_profile_id_fkey"
            columns: ["assigned_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_driver_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_driver_assignments_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_occurrences: {
        Row: {
          delivery_id: string
          description: string
          id: string
          occurred_at: string
          occurred_by_profile_id: string | null
          occurrence_type: string
        }
        Insert: {
          delivery_id: string
          description: string
          id?: string
          occurred_at?: string
          occurred_by_profile_id?: string | null
          occurrence_type: string
        }
        Update: {
          delivery_id?: string
          description?: string
          id?: string
          occurred_at?: string
          occurred_by_profile_id?: string | null
          occurrence_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_occurrences_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_occurrences_occurred_by_profile_id_fkey"
            columns: ["occurred_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_proofs: {
        Row: {
          byte_size: number
          captured_at: string
          captured_by_profile_id: string
          delivery_id: string
          id: string
          mime_type: string
          storage_object_path: string
        }
        Insert: {
          byte_size: number
          captured_at?: string
          captured_by_profile_id: string
          delivery_id: string
          id?: string
          mime_type: string
          storage_object_path: string
        }
        Update: {
          byte_size?: number
          captured_at?: string
          captured_by_profile_id?: string
          delivery_id?: string
          id?: string
          mime_type?: string
          storage_object_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_captured_by_profile_id_fkey"
            columns: ["captured_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_proofs_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          changed_at: string
          changed_by_profile_id: string | null
          correlation_id: string | null
          delivery_id: string
          from_status: string | null
          id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by_profile_id?: string | null
          correlation_id?: string | null
          delivery_id: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by_profile_id?: string | null
          correlation_id?: string | null
          delivery_id?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_status_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_records: {
        Row: {
          actor_profile_id: string | null
          command: string
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string
          response_body: Json | null
          response_status: number | null
          scope_key: string
        }
        Insert: {
          actor_profile_id?: string | null
          command: string
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          request_hash: string
          response_body?: Json | null
          response_status?: number | null
          scope_key: string
        }
        Update: {
          actor_profile_id?: string | null
          command?: string
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          response_body?: Json | null
          response_status?: number | null
          scope_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_records_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          inventory_location_id: string
          on_hand: number
          reserved: number
          sku_id: string
          updated_at: string
        }
        Insert: {
          inventory_location_id: string
          on_hand?: number
          reserved?: number
          sku_id: string
          updated_at?: string
        }
        Update: {
          inventory_location_id?: string
          on_hand?: number
          reserved?: number
          sku_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          created_at: string
          id: string
          location_type: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_type?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_type?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          actor_profile_id: string | null
          adjustment_reference: string | null
          id: string
          idempotency_key: string | null
          inventory_location_id: string
          movement_type: string
          occurred_at: string
          on_hand_after: number
          on_hand_before: number
          on_hand_delta: number
          order_id: string | null
          order_item_id: string | null
          reason: string | null
          reservation_id: string | null
          reserved_after: number
          reserved_before: number
          reserved_delta: number
          sku_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          adjustment_reference?: string | null
          id?: string
          idempotency_key?: string | null
          inventory_location_id: string
          movement_type: string
          occurred_at?: string
          on_hand_after: number
          on_hand_before: number
          on_hand_delta: number
          order_id?: string | null
          order_item_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          reserved_after: number
          reserved_before: number
          reserved_delta: number
          sku_id: string
        }
        Update: {
          actor_profile_id?: string | null
          adjustment_reference?: string | null
          id?: string
          idempotency_key?: string | null
          inventory_location_id?: string
          movement_type?: string
          occurred_at?: string
          on_hand_after?: number
          on_hand_before?: number
          on_hand_delta?: number
          order_id?: string | null
          order_item_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          reserved_after?: number
          reserved_before?: number
          reserved_delta?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_location_id_sku_id_fkey"
            columns: ["inventory_location_id", "sku_id"]
            isOneToOne: false
            referencedRelation: "inventory_balances"
            referencedColumns: ["inventory_location_id", "sku_id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_inventory_location_id_fkey"
            columns: ["order_id", "inventory_location_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "inventory_location_id"]
          },
          {
            foreignKeyName: "inventory_movements_order_item_id_order_id_sku_id_fkey"
            columns: ["order_item_id", "order_id", "sku_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id", "order_id", "sku_id"]
          },
          {
            foreignKeyName: "inventory_movements_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "inventory_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          id: string
          inventory_location_id: string
          order_id: string
          order_item_id: string
          quantity: number
          sku_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_location_id: string
          order_id: string
          order_item_id: string
          quantity: number
          sku_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_location_id?: string
          order_id?: string
          order_item_id?: string
          quantity?: number
          sku_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_inventory_location_id_sku_id_fkey"
            columns: ["inventory_location_id", "sku_id"]
            isOneToOne: false
            referencedRelation: "inventory_balances"
            referencedColumns: ["inventory_location_id", "sku_id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_id_inventory_location_id_fkey"
            columns: ["order_id", "inventory_location_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "inventory_location_id"]
          },
          {
            foreignKeyName: "inventory_reservations_order_item_id_order_id_sku_id_fkey"
            columns: ["order_item_id", "order_id", "sku_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id", "order_id", "sku_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          notification_type: string
          read_at: string | null
          recipient_profile_id: string
          resource_id: string | null
          resource_type: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          notification_type: string
          read_at?: string | null
          recipient_profile_id: string
          resource_id?: string | null
          resource_type?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          recipient_profile_id?: string
          resource_id?: string | null
          resource_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          order_id: string
          quantity: number
          sale_unit_snapshot: string
          sku_id: string
          sku_name_snapshot: string
          subtotal_minor: number
          unit_price_minor: number
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          order_id: string
          quantity: number
          sale_unit_snapshot: string
          sku_id: string
          sku_name_snapshot: string
          subtotal_minor: number
          unit_price_minor: number
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          order_id?: string
          quantity?: number
          sale_unit_snapshot?: string
          sku_id?: string
          sku_name_snapshot?: string
          subtotal_minor?: number
          unit_price_minor?: number
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
            foreignKeyName: "order_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by_profile_id: string | null
          correlation_id: string | null
          from_status: string | null
          id: string
          order_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by_profile_id?: string | null
          correlation_id?: string | null
          from_status?: string | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by_profile_id?: string | null
          correlation_id?: string | null
          from_status?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot: Json
          cancelled_at: string | null
          cart_id: string
          company_id: string
          confirmed_at: string
          confirmed_window: Json | null
          created_at: string
          created_by_profile_id: string
          currency_code: string
          delivery_fee_minor: number
          establishment_id: string
          id: string
          inventory_location_id: string
          order_number: number
          requested_window: Json | null
          status: string
          subtotal_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          address_snapshot: Json
          cancelled_at?: string | null
          cart_id: string
          company_id: string
          confirmed_at?: string
          confirmed_window?: Json | null
          created_at?: string
          created_by_profile_id: string
          currency_code?: string
          delivery_fee_minor?: number
          establishment_id: string
          id?: string
          inventory_location_id: string
          order_number?: number
          requested_window?: Json | null
          status?: string
          subtotal_minor: number
          total_minor: number
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          cancelled_at?: string | null
          cart_id?: string
          company_id?: string
          confirmed_at?: string
          confirmed_window?: Json | null
          created_at?: string
          created_by_profile_id?: string
          currency_code?: string
          delivery_fee_minor?: number
          establishment_id?: string
          id?: string
          inventory_location_id?: string
          order_number?: number
          requested_window?: Json | null
          status?: string
          subtotal_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cart_id_company_id_fkey"
            columns: ["cart_id", "company_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_profile_id_company_id_fkey"
            columns: ["created_by_profile_id", "company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "orders_establishment_id_company_id_fkey"
            columns: ["establishment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "orders_inventory_location_id_fkey"
            columns: ["inventory_location_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          amount_minor: number
          company_id: string
          created_at: string
          currency_code: string
          id: string
          sku_id: string
          source: string
          status: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          amount_minor: number
          company_id: string
          created_at?: string
          currency_code?: string
          id?: string
          sku_id: string
          source?: string
          status?: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          amount_minor?: number
          company_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          sku_id?: string
          source?: string
          status?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          byte_size: number
          created_at: string
          id: string
          is_primary: boolean
          mime_type: string
          product_id: string | null
          sort_order: number
          storage_object_path: string
          variant_id: string | null
        }
        Insert: {
          alt_text: string
          byte_size: number
          created_at?: string
          id?: string
          is_primary?: boolean
          mime_type: string
          product_id?: string | null
          sort_order?: number
          storage_object_path: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string
          byte_size?: number
          created_at?: string
          id?: string
          is_primary?: boolean
          mime_type?: string
          product_id?: string | null
          sort_order?: number
          storage_object_path?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          name: string
          product_id: string
          sale_unit: string
          sku_code: string
          status: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          name: string
          product_id: string
          sale_unit: string
          sku_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sale_unit?: string
          sku_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_profile_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_profile_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_status_history: {
        Row: {
          changed_at: string
          changed_by_profile_id: string | null
          from_status: string | null
          id: string
          reason: string | null
          ticket_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by_profile_id?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          ticket_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by_profile_id?: string | null
          from_status?: string | null
          id?: string
          reason?: string | null
          ticket_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_status_history_changed_by_profile_id_fkey"
            columns: ["changed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_profile_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          delivery_id: string | null
          id: string
          opened_by_profile_id: string
          order_id: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to_profile_id?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          opened_by_profile_id: string
          order_id?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to_profile_id?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          delivery_id?: string | null
          id?: string
          opened_by_profile_id?: string
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_profile_id_fkey"
            columns: ["assigned_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_opened_by_profile_id_company_id_fkey"
            columns: ["opened_by_profile_id", "company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_company_invitation: {
        Args: { p_full_name?: string; p_invitation_token: string }
        Returns: {
          company_id: string
          company_name: string
        }[]
      }
      add_to_active_cart: {
        Args: { p_quantity?: number; p_sku_id: string }
        Returns: {
          cart_id: string
          quantity: number
        }[]
      }
      add_to_establishment_cart: {
        Args: {
          p_establishment_id: string
          p_quantity?: number
          p_sku_id: string
        }
        Returns: {
          cart_id: string
          quantity: number
        }[]
      }
      admin_get_company: { Args: { p_company_id: string }; Returns: Json }
      admin_list_companies: {
        Args: never
        Returns: {
          display_name: string
          establishments_count: number
          id: string
          legal_name: string
          status: string
          tax_id: string
        }[]
      }
      admin_list_company_invitations: {
        Args: { p_company_id: string }
        Returns: {
          created_at: string
          expires_at: string
          invitation_id: string
          invited_email: string
          status: string
        }[]
      }
      admin_list_establishments: {
        Args: { p_company_id: string }
        Returns: {
          address_label: string
          city: string
          id: string
          name: string
          state: string
          status: string
        }[]
      }
      admin_list_orders: {
        Args: { p_status?: string }
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          delivery_window: string
          establishment_name: string
          id: string
          order_number: number
          status: string
          total_minor: number
          units: number
        }[]
      }
      admin_set_company_status: {
        Args: { p_company_id: string; p_status: string }
        Returns: boolean
      }
      admin_set_establishment_status: {
        Args: { p_establishment_id: string; p_status: string }
        Returns: boolean
      }
      admin_start_order_picking: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      admin_update_company: {
        Args: { p_company_id: string; p_data: Json }
        Returns: {
          display_name: string
          id: string
          status: string
        }[]
      }
      advance_order_status: {
        Args: { p_order_id: string; p_to_status: string }
        Returns: boolean
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: boolean
      }
      company_assign_order_driver: {
        Args: { p_driver_profile_id: string; p_order_id: string }
        Returns: boolean
      }
      company_get_order_details: {
        Args: { p_order_id: string }
        Returns: Json
      }
      company_list_drivers: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      company_list_orders: {
        Args: { p_status?: string }
        Returns: {
          company_id: string
          company_name: string
          created_at: string
          delivery_window: string
          establishment_name: string
          id: string
          order_number: number
          status: string
          total_minor: number
          units: number
        }[]
      }
      company_start_order_picking: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      confirm_active_cart: {
        Args: {
          p_address_snapshot?: Json
          p_cart_id?: string
          p_confirmed_window?: Json
        }
        Returns: {
          order_id: string
          order_number: number
        }[]
      }
      confirm_active_cart_with_address: {
        Args: {
          p_address_id: string
          p_cart_id: string
          p_window_label: string
        }
        Returns: {
          order_id: string
          order_number: number
        }[]
      }
      create_company: {
        Args: { p_company: Json }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      create_company_invitation:
        | {
            Args: {
              p_company_id: string
              p_expires_in?: string
              p_invited_email: string
            }
            Returns: {
              expires_at: string
              invitation_id: string
              invitation_token: string
            }[]
          }
        | {
            Args: {
              p_company_id: string
              p_expires_in?: string
              p_invited_email: string
              p_invited_role: string
            }
            Returns: {
              expires_at: string
              invitation_id: string
              invitation_token: string
            }[]
          }
      create_establishment: {
        Args: { p_address: Json; p_company_id: string; p_name: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      current_profile: {
        Args: never
        Returns: {
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_membership: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      revoke_company_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      set_active_cart_item_quantity: {
        Args: { p_cart_id: string; p_quantity: number; p_sku_id: string }
        Returns: {
          cart_id: string
          quantity: number
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
