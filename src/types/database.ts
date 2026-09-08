export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "ADMIN" | "TEAM_MEMBER";
export type GalleryStatus = "DRAFT" | "PUBLISHED";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          name: string;
          description: string;
          event_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          event_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          event_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_members: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          assigned_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          event_id: string;
          uploaded_by: string;
          filename: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          is_selected: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          uploaded_by: string;
          filename: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          is_selected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          uploaded_by?: string;
          filename?: string;
          storage_path?: string;
          file_size?: number;
          mime_type?: string;
          is_selected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      galleries: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          slug: string;
          status: GalleryStatus;
          pin_hash: string | null;
          published_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          slug: string;
          status?: GalleryStatus;
          pin_hash?: string | null;
          published_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          slug?: string;
          status?: GalleryStatus;
          pin_hash?: string | null;
          published_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      gallery_photos: {
        Row: {
          id: string;
          gallery_id: string;
          photo_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          gallery_id: string;
          photo_id: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          gallery_id?: string;
          photo_id?: string;
          added_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      gallery_status: GalleryStatus;
    };
  };
}
