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
    PostgrestVersion: "14.18"
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
      abonnements_push: {
        Row: {
          appareil: string | null
          auth: string
          cree_le: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          appareil?: string | null
          auth: string
          cree_le?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          appareil?: string | null
          auth?: string
          cree_le?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_push_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      baux: {
        Row: {
          actif: boolean | null
          caution_montant: number
          cree_le: string
          cree_par: string | null
          date_debut: string
          date_fin: string | null
          espace_id: string
          id: string
          jour_echeance: number
          locataire_id: string
          logement_id: string
          lot_suppression: string | null
          loyer: number
          modifie_le: string | null
          premier_mois_montant: number | null
          reference: string | null
          supprime_le: string | null
          supprime_par: string | null
        }
        Insert: {
          actif?: boolean | null
          caution_montant?: number
          cree_le?: string
          cree_par?: string | null
          date_debut: string
          date_fin?: string | null
          espace_id: string
          id?: string
          jour_echeance?: number
          locataire_id: string
          logement_id: string
          lot_suppression?: string | null
          loyer: number
          modifie_le?: string | null
          premier_mois_montant?: number | null
          reference?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Update: {
          actif?: boolean | null
          caution_montant?: number
          cree_le?: string
          cree_par?: string | null
          date_debut?: string
          date_fin?: string | null
          espace_id?: string
          id?: string
          jour_echeance?: number
          locataire_id?: string
          logement_id?: string
          lot_suppression?: string | null
          loyer?: number
          modifie_le?: string | null
          premier_mois_montant?: number | null
          reference?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baux_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baux_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baux_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
        ]
      }
      compteurs_recus: {
        Row: {
          annee: number
          dernier: number
          espace_id: string
          serie: string
        }
        Insert: {
          annee: number
          dernier?: number
          espace_id: string
          serie?: string
        }
        Update: {
          annee?: number
          dernier?: number
          espace_id?: string
          serie?: string
        }
        Relationships: [
          {
            foreignKeyName: "compteurs_recus_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes: {
        Row: {
          cible_id: string
          cible_libelle: string | null
          cible_table: string
          cree_le: string
          cree_par: string | null
          demande_par: string
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          motif: string
          reponse: string | null
          statut: Database["public"]["Enums"]["statut_demande"]
          supprime_le: string | null
          supprime_par: string | null
          traite_le: string | null
          traite_par: string | null
          type: string
        }
        Insert: {
          cible_id: string
          cible_libelle?: string | null
          cible_table: string
          cree_le?: string
          cree_par?: string | null
          demande_par?: string
          espace_id: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          motif: string
          reponse?: string | null
          statut?: Database["public"]["Enums"]["statut_demande"]
          supprime_le?: string | null
          supprime_par?: string | null
          traite_le?: string | null
          traite_par?: string | null
          type: string
        }
        Update: {
          cible_id?: string
          cible_libelle?: string | null
          cible_table?: string
          cree_le?: string
          cree_par?: string | null
          demande_par?: string
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          motif?: string
          reponse?: string | null
          statut?: Database["public"]["Enums"]["statut_demande"]
          supprime_le?: string | null
          supprime_par?: string | null
          traite_le?: string | null
          traite_par?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandes_demande_par_fkey"
            columns: ["demande_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_acces: {
        Row: {
          cree_le: string
          email: string | null
          espace_id: string | null
          id: string
          ip: unknown
          message: string | null
          nb_logements: number | null
          nom: string
          reponse: string | null
          statut: Database["public"]["Enums"]["statut_demande"]
          telephone: string
          traite_le: string | null
          traite_par: string | null
          ville: string | null
        }
        Insert: {
          cree_le?: string
          email?: string | null
          espace_id?: string | null
          id?: string
          ip?: unknown
          message?: string | null
          nb_logements?: number | null
          nom: string
          reponse?: string | null
          statut?: Database["public"]["Enums"]["statut_demande"]
          telephone: string
          traite_le?: string | null
          traite_par?: string | null
          ville?: string | null
        }
        Update: {
          cree_le?: string
          email?: string | null
          espace_id?: string | null
          id?: string
          ip?: unknown
          message?: string | null
          nb_logements?: number | null
          nom?: string
          reponse?: string | null
          statut?: Database["public"]["Enums"]["statut_demande"]
          telephone?: string
          traite_le?: string | null
          traite_par?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_acces_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandes_acces_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      espaces: {
        Row: {
          actif: boolean
          adresse: string | null
          cachet_path: string | null
          couleur_primaire: string
          cree_le: string
          cree_par: string | null
          delai_retard_jours: number
          email: string | null
          formule: Database["public"]["Enums"]["formule"]
          icones_menu: Json
          id: string
          limites_actives: boolean
          logo_path: string | null
          lot_suppression: string | null
          max_logements: number | null
          modifie_le: string | null
          nom: string
          prefixe_recu: string
          signature_path: string | null
          slug: string | null
          supprime_le: string | null
          supprime_par: string | null
          telephone: string | null
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          cachet_path?: string | null
          couleur_primaire?: string
          cree_le?: string
          cree_par?: string | null
          delai_retard_jours?: number
          email?: string | null
          formule?: Database["public"]["Enums"]["formule"]
          icones_menu?: Json
          id?: string
          limites_actives?: boolean
          logo_path?: string | null
          lot_suppression?: string | null
          max_logements?: number | null
          modifie_le?: string | null
          nom: string
          prefixe_recu: string
          signature_path?: string | null
          slug?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          cachet_path?: string | null
          couleur_primaire?: string
          cree_le?: string
          cree_par?: string | null
          delai_retard_jours?: number
          email?: string | null
          formule?: Database["public"]["Enums"]["formule"]
          icones_menu?: Json
          id?: string
          limites_actives?: boolean
          logo_path?: string | null
          lot_suppression?: string | null
          max_logements?: number | null
          modifie_le?: string | null
          nom?: string
          prefixe_recu?: string
          signature_path?: string | null
          slug?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          telephone?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      historique_modifications: {
        Row: {
          appareil: string | null
          apres: Json | null
          avant: Json | null
          champs_modifies: string[] | null
          espace_id: string | null
          id: number
          ip: unknown
          le: string
          ligne_id: string
          operation: string
          par: string | null
          table_nom: string
        }
        Insert: {
          appareil?: string | null
          apres?: Json | null
          avant?: Json | null
          champs_modifies?: string[] | null
          espace_id?: string | null
          id?: number
          ip?: unknown
          le?: string
          ligne_id: string
          operation: string
          par?: string | null
          table_nom: string
        }
        Update: {
          appareil?: string | null
          apres?: Json | null
          avant?: Json | null
          champs_modifies?: string[] | null
          espace_id?: string | null
          id?: number
          ip?: unknown
          le?: string
          ligne_id?: string
          operation?: string
          par?: string | null
          table_nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "historique_modifications_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      imputations: {
        Row: {
          bail_id: string
          cree_le: string
          cree_par: string | null
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mois: string
          montant: number
          paiement_id: string
          remise: number
          supprime_le: string | null
          supprime_par: string | null
        }
        Insert: {
          bail_id: string
          cree_le?: string
          cree_par?: string | null
          espace_id: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mois: string
          montant?: number
          paiement_id: string
          remise?: number
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Update: {
          bail_id?: string
          cree_le?: string
          cree_par?: string | null
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mois?: string
          montant?: number
          paiement_id?: string
          remise?: number
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imputations_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "baux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imputations_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "v_situation_baux"
            referencedColumns: ["bail_id"]
          },
          {
            foreignKeyName: "imputations_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imputations_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_audit: {
        Row: {
          action: string
          appareil: string | null
          cible_id: string | null
          cible_table: string | null
          details: Json | null
          espace_id: string | null
          id: number
          identifiant: string | null
          ip: unknown
          le: string
          libelle: string | null
          navigateur: string | null
          reussi: boolean
          user_id: string | null
        }
        Insert: {
          action: string
          appareil?: string | null
          cible_id?: string | null
          cible_table?: string | null
          details?: Json | null
          espace_id?: string | null
          id?: number
          identifiant?: string | null
          ip?: unknown
          le?: string
          libelle?: string | null
          navigateur?: string | null
          reussi?: boolean
          user_id?: string | null
        }
        Update: {
          action?: string
          appareil?: string | null
          cible_id?: string | null
          cible_table?: string | null
          details?: Json | null
          espace_id?: string | null
          id?: number
          identifiant?: string | null
          ip?: unknown
          le?: string
          libelle?: string | null
          navigateur?: string | null
          reussi?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      locataires: {
        Row: {
          contact_urgence: string | null
          cree_le: string
          cree_par: string | null
          email: string | null
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          nom: string
          notes: string | null
          piece_numero: string | null
          piece_type: string | null
          prenoms: string | null
          profession: string | null
          supprime_le: string | null
          supprime_par: string | null
          telephone: string | null
          telephone2: string | null
        }
        Insert: {
          contact_urgence?: string | null
          cree_le?: string
          cree_par?: string | null
          email?: string | null
          espace_id: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          nom: string
          notes?: string | null
          piece_numero?: string | null
          piece_type?: string | null
          prenoms?: string | null
          profession?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          telephone?: string | null
          telephone2?: string | null
        }
        Update: {
          contact_urgence?: string | null
          cree_le?: string
          cree_par?: string | null
          email?: string | null
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          nom?: string
          notes?: string | null
          piece_numero?: string | null
          piece_type?: string | null
          prenoms?: string | null
          profession?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          telephone?: string | null
          telephone2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locataires_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
        ]
      }
      logements: {
        Row: {
          cree_le: string
          cree_par: string | null
          designation: string
          espace_id: string
          id: string
          lot_suppression: string | null
          loyer_reference: number | null
          maison_id: string
          modifie_le: string | null
          niveau: string | null
          notes: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_logement"]
        }
        Insert: {
          cree_le?: string
          cree_par?: string | null
          designation: string
          espace_id: string
          id?: string
          lot_suppression?: string | null
          loyer_reference?: number | null
          maison_id: string
          modifie_le?: string | null
          niveau?: string | null
          notes?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type: Database["public"]["Enums"]["type_logement"]
        }
        Update: {
          cree_le?: string
          cree_par?: string | null
          designation?: string
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          loyer_reference?: number | null
          maison_id?: string
          modifie_le?: string | null
          niveau?: string | null
          notes?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type?: Database["public"]["Enums"]["type_logement"]
        }
        Relationships: [
          {
            foreignKeyName: "logements_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logements_maison_id_fkey"
            columns: ["maison_id"]
            isOneToOne: false
            referencedRelation: "maisons"
            referencedColumns: ["id"]
          },
        ]
      }
      lots_suppression: {
        Row: {
          espace_id: string | null
          id: string
          libelle: string
          nb_elements: number
          racine_id: string
          racine_table: string
          supprime_le: string
          supprime_par: string | null
        }
        Insert: {
          espace_id?: string | null
          id?: string
          libelle: string
          nb_elements?: number
          racine_id: string
          racine_table: string
          supprime_le?: string
          supprime_par?: string | null
        }
        Update: {
          espace_id?: string | null
          id?: string
          libelle?: string
          nb_elements?: number
          racine_id?: string
          racine_table?: string
          supprime_le?: string
          supprime_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_suppression_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_suppression_supprime_par_fkey"
            columns: ["supprime_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      maisons: {
        Row: {
          cree_le: string
          cree_par: string | null
          espace_id: string
          gestionnaire_id: string | null
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          nom: string
          notes: string | null
          photo_path: string | null
          quartier: string | null
          repere: string | null
          supprime_le: string | null
          supprime_par: string | null
          ville: string | null
        }
        Insert: {
          cree_le?: string
          cree_par?: string | null
          espace_id: string
          gestionnaire_id?: string | null
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          nom: string
          notes?: string | null
          photo_path?: string | null
          quartier?: string | null
          repere?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          ville?: string | null
        }
        Update: {
          cree_le?: string
          cree_par?: string | null
          espace_id?: string
          gestionnaire_id?: string | null
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          nom?: string
          notes?: string | null
          photo_path?: string | null
          quartier?: string | null
          repere?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maisons_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maisons_gestionnaire_id_fkey"
            columns: ["gestionnaire_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      membre_maisons: {
        Row: {
          espace_id: string
          maison_id: string
          user_id: string
        }
        Insert: {
          espace_id: string
          maison_id: string
          user_id: string
        }
        Update: {
          espace_id?: string
          maison_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membre_maisons_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membre_maisons_maison_id_fkey"
            columns: ["maison_id"]
            isOneToOne: false
            referencedRelation: "maisons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membre_maisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      membres: {
        Row: {
          actif: boolean
          cree_le: string
          espace_id: string
          role: Database["public"]["Enums"]["role_membre"]
          user_id: string
        }
        Insert: {
          actif?: boolean
          cree_le?: string
          espace_id: string
          role: Database["public"]["Enums"]["role_membre"]
          user_id: string
        }
        Update: {
          actif?: boolean
          cree_le?: string
          espace_id?: string
          role?: Database["public"]["Enums"]["role_membre"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membres_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements_caution: {
        Row: {
          bail_id: string
          cree_le: string
          cree_par: string | null
          date_mouvement: string
          encaisse_par: string | null
          espace_id: string
          id: string
          lot_suppression: string | null
          mode: Database["public"]["Enums"]["mode_paiement"] | null
          modifie_le: string | null
          montant: number
          motif: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_mvt_caution"]
        }
        Insert: {
          bail_id: string
          cree_le?: string
          cree_par?: string | null
          date_mouvement: string
          encaisse_par?: string | null
          espace_id: string
          id?: string
          lot_suppression?: string | null
          mode?: Database["public"]["Enums"]["mode_paiement"] | null
          modifie_le?: string | null
          montant: number
          motif?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type: Database["public"]["Enums"]["type_mvt_caution"]
        }
        Update: {
          bail_id?: string
          cree_le?: string
          cree_par?: string | null
          date_mouvement?: string
          encaisse_par?: string | null
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          mode?: Database["public"]["Enums"]["mode_paiement"] | null
          modifie_le?: string | null
          montant?: number
          motif?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type?: Database["public"]["Enums"]["type_mvt_caution"]
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_caution_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "baux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caution_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "v_situation_baux"
            referencedColumns: ["bail_id"]
          },
          {
            foreignKeyName: "mouvements_caution_encaisse_par_fkey"
            columns: ["encaisse_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_caution_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          canaux: string[]
          cree_le: string
          email_statut: string | null
          espace_id: string | null
          id: string
          lien: string | null
          lu_le: string | null
          message: string | null
          par: string | null
          push_statut: string | null
          tentatives: number
          titre: string
          type: string
          user_id: string
        }
        Insert: {
          canaux?: string[]
          cree_le?: string
          email_statut?: string | null
          espace_id?: string | null
          id?: string
          lien?: string | null
          lu_le?: string | null
          message?: string | null
          par?: string | null
          push_statut?: string | null
          tentatives?: number
          titre: string
          type: string
          user_id: string
        }
        Update: {
          canaux?: string[]
          cree_le?: string
          email_statut?: string | null
          espace_id?: string | null
          id?: string
          lien?: string | null
          lu_le?: string | null
          message?: string | null
          par?: string | null
          push_statut?: string | null
          tentatives?: number
          titre?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          a_verifier: string[]
          annule_le: string | null
          annule_par: string | null
          bail_id: string
          cle_idempotence: string
          cree_le: string
          cree_par: string | null
          date_paiement: string
          encaisse_par: string
          espace_id: string
          id: string
          lot_suppression: string | null
          mode: Database["public"]["Enums"]["mode_paiement"]
          modifie_le: string | null
          montant: number
          motif_annulation: string | null
          motif_remise: string | null
          payeur: string
          reference_transaction: string | null
          remise: number
          remplace_paiement_id: string | null
          reprise: Json | null
          statut: Database["public"]["Enums"]["statut_paiement"]
          supprime_le: string | null
          supprime_par: string | null
        }
        Insert: {
          a_verifier?: string[]
          annule_le?: string | null
          annule_par?: string | null
          bail_id: string
          cle_idempotence: string
          cree_le?: string
          cree_par?: string | null
          date_paiement: string
          encaisse_par: string
          espace_id: string
          id?: string
          lot_suppression?: string | null
          mode: Database["public"]["Enums"]["mode_paiement"]
          modifie_le?: string | null
          montant: number
          motif_annulation?: string | null
          motif_remise?: string | null
          payeur: string
          reference_transaction?: string | null
          remise?: number
          remplace_paiement_id?: string | null
          reprise?: Json | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Update: {
          a_verifier?: string[]
          annule_le?: string | null
          annule_par?: string | null
          bail_id?: string
          cle_idempotence?: string
          cree_le?: string
          cree_par?: string | null
          date_paiement?: string
          encaisse_par?: string
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          mode?: Database["public"]["Enums"]["mode_paiement"]
          modifie_le?: string | null
          montant?: number
          motif_annulation?: string | null
          motif_remise?: string | null
          payeur?: string
          reference_transaction?: string | null
          remise?: number
          remplace_paiement_id?: string | null
          reprise?: Json | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_annule_par_fkey"
            columns: ["annule_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "baux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "v_situation_baux"
            referencedColumns: ["bail_id"]
          },
          {
            foreignKeyName: "paiements_encaisse_par_fkey"
            columns: ["encaisse_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_remplace_paiement_id_fkey"
            columns: ["remplace_paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          actif: boolean
          cree_le: string
          doit_changer_mdp: boolean
          email: string | null
          est_super_admin: boolean
          id: string
          identifiant: string
          modifie_le: string | null
          nom_complet: string
          preferences: Json
          signature_path: string | null
          telephone: string | null
        }
        Insert: {
          actif?: boolean
          cree_le?: string
          doit_changer_mdp?: boolean
          email?: string | null
          est_super_admin?: boolean
          id: string
          identifiant: string
          modifie_le?: string | null
          nom_complet: string
          preferences?: Json
          signature_path?: string | null
          telephone?: string | null
        }
        Update: {
          actif?: boolean
          cree_le?: string
          doit_changer_mdp?: boolean
          email?: string | null
          est_super_admin?: boolean
          id?: string
          identifiant?: string
          modifie_le?: string | null
          nom_complet?: string
          preferences?: Json
          signature_path?: string | null
          telephone?: string | null
        }
        Relationships: []
      }
      recus: {
        Row: {
          code_verification: string
          contenu: Json
          cree_le: string
          cree_par: string | null
          emis_le: string
          emis_par: string | null
          empreinte: string
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mouvement_caution_id: string | null
          nb_duplicatas: number
          numero: string
          original_genere: boolean
          paiement_id: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_recu"]
        }
        Insert: {
          code_verification: string
          contenu: Json
          cree_le?: string
          cree_par?: string | null
          emis_le?: string
          emis_par?: string | null
          empreinte: string
          espace_id: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mouvement_caution_id?: string | null
          nb_duplicatas?: number
          numero: string
          original_genere?: boolean
          paiement_id?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type: Database["public"]["Enums"]["type_recu"]
        }
        Update: {
          code_verification?: string
          contenu?: Json
          cree_le?: string
          cree_par?: string | null
          emis_le?: string
          emis_par?: string | null
          empreinte?: string
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mouvement_caution_id?: string | null
          nb_duplicatas?: number
          numero?: string
          original_genere?: boolean
          paiement_id?: string | null
          supprime_le?: string | null
          supprime_par?: string | null
          type?: Database["public"]["Enums"]["type_recu"]
        }
        Relationships: [
          {
            foreignKeyName: "recus_emis_par_fkey"
            columns: ["emis_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_mouvement_caution_id_fkey"
            columns: ["mouvement_caution_id"]
            isOneToOne: true
            referencedRelation: "mouvements_caution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recus_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: true
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      reimpressions: {
        Row: {
          espace_id: string
          id: string
          le: string
          par: string | null
          recu_id: string
        }
        Insert: {
          espace_id: string
          id?: string
          le?: string
          par?: string | null
          recu_id: string
        }
        Update: {
          espace_id?: string
          id?: string
          le?: string
          par?: string | null
          recu_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimpressions_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimpressions_par_fkey"
            columns: ["par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimpressions_recu_id_fkey"
            columns: ["recu_id"]
            isOneToOne: false
            referencedRelation: "recus"
            referencedColumns: ["id"]
          },
        ]
      }
      revisions_loyer: {
        Row: {
          bail_id: string
          cree_le: string
          cree_par: string | null
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mois_effet: string
          montant: number
          supprime_le: string | null
          supprime_par: string | null
        }
        Insert: {
          bail_id: string
          cree_le?: string
          cree_par?: string | null
          espace_id: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mois_effet: string
          montant: number
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Update: {
          bail_id?: string
          cree_le?: string
          cree_par?: string | null
          espace_id?: string
          id?: string
          lot_suppression?: string | null
          modifie_le?: string | null
          mois_effet?: string
          montant?: number
          supprime_le?: string | null
          supprime_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisions_loyer_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "baux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisions_loyer_bail_id_fkey"
            columns: ["bail_id"]
            isOneToOne: false
            referencedRelation: "v_situation_baux"
            referencedColumns: ["bail_id"]
          },
          {
            foreignKeyName: "revisions_loyer_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_corbeille: {
        Row: {
          espace_id: string | null
          id: string | null
          libelle: string | null
          lot_suppression: string | null
          nb_elements_du_lot: number | null
          supprime_le: string | null
          supprime_par_nom: string | null
          table: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_suppression_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_situation_baux: {
        Row: {
          actif: boolean | null
          bail_id: string | null
          date_debut: string | null
          date_fin: string | null
          dernier_mois_solde: string | null
          espace_id: string | null
          locataire_id: string | null
          logement_id: string | null
          loyer: number | null
          maison_id: string | null
          montant_du: number | null
          nb_mois_dus: number | null
          nb_mois_retard: number | null
          prochain_mois_du: string | null
          statut: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baux_espace_id_fkey"
            columns: ["espace_id"]
            isOneToOne: false
            referencedRelation: "espaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baux_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baux_logement_id_fkey"
            columns: ["logement_id"]
            isOneToOne: false
            referencedRelation: "logements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logements_maison_id_fkey"
            columns: ["maison_id"]
            isOneToOne: false
            referencedRelation: "maisons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      annuler_paiement: {
        Args: { p_motif: string; p_paiement: string }
        Returns: undefined
      }
      apercu_suppression: {
        Args: { p_id: string; p_table: string }
        Returns: Json
      }
      appareil_de: { Args: { p_ua: string }; Returns: string }
      auditer: {
        Args: {
          p_action: string
          p_cible_id?: string
          p_cible_table?: string
          p_details?: Json
          p_espace?: string
          p_identifiant?: string
          p_libelle?: string
          p_reussi?: boolean
          p_user?: string
        }
        Returns: undefined
      }
      aujourdhui: { Args: never; Returns: string }
      bail_du_recu: {
        Args: { p_mouvement: string; p_paiement: string }
        Returns: string
      }
      canaux_par_defaut: { Args: { p_type: string }; Returns: string[] }
      changer_mois_paiement_repris: {
        Args: { p_mois: string; p_paiement: string }
        Returns: undefined
      }
      collecter_cascade: {
        Args: { p_id: string; p_table: string }
        Returns: {
          ids: string[]
          tbl: string
        }[]
      }
      consultations_de: { Args: { p_espace: string }; Returns: string[] }
      contenu_recu: {
        Args: {
          p_mouvement: string
          p_numero: string
          p_paiement: string
          p_type: Database["public"]["Enums"]["type_recu"]
        }
        Returns: Json
      }
      corriger_paiement: { Args: { p_paiement: string }; Returns: undefined }
      echeances_bail: {
        Args: { p_bail: string; p_jusqua?: string }
        Returns: {
          du: number
          mois: string
          paye: number
          remise: number
          reste: number
          statut: string
        }[]
      }
      emettre_recu: {
        Args: {
          p_mouvement: string
          p_paiement: string
          p_type: Database["public"]["Enums"]["type_recu"]
        }
        Returns: {
          code_verification: string
          contenu: Json
          cree_le: string
          cree_par: string | null
          emis_le: string
          emis_par: string | null
          empreinte: string
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mouvement_caution_id: string | null
          nb_duplicatas: number
          numero: string
          original_genere: boolean
          paiement_id: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_recu"]
        }
        SetofOptions: {
          from: "*"
          to: "recus"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      encaisser: {
        Args: {
          p_bail: string
          p_cle_idempotence: string
          p_date: string
          p_mode: Database["public"]["Enums"]["mode_paiement"]
          p_mois?: string[]
          p_montant: number
          p_motif_remise?: string
          p_payeur: string
          p_reference: string
          p_remplace?: string
          p_reste?: string
        }
        Returns: {
          code_verification: string
          contenu: Json
          cree_le: string
          cree_par: string | null
          emis_le: string
          emis_par: string | null
          empreinte: string
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mouvement_caution_id: string | null
          nb_duplicatas: number
          numero: string
          original_genere: boolean
          paiement_id: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_recu"]
        }
        SetofOptions: {
          from: "*"
          to: "recus"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enregistrer_abonnement_push: {
        Args: {
          p_appareil: string
          p_auth: string
          p_endpoint: string
          p_p256dh: string
        }
        Returns: undefined
      }
      enregistrer_demande_acces: {
        Args: {
          p_email: string
          p_ip: unknown
          p_message: string
          p_nb_logements: number
          p_nom: string
          p_telephone: string
          p_ville: string
        }
        Returns: string
      }
      enregistrer_mouvement_caution: {
        Args: {
          p_bail: string
          p_date: string
          p_mode?: Database["public"]["Enums"]["mode_paiement"]
          p_montant: number
          p_motif?: string
          p_type: Database["public"]["Enums"]["type_mvt_caution"]
        }
        Returns: {
          code_verification: string
          contenu: Json
          cree_le: string
          cree_par: string | null
          emis_le: string
          emis_par: string | null
          empreinte: string
          espace_id: string
          id: string
          lot_suppression: string | null
          modifie_le: string | null
          mouvement_caution_id: string | null
          nb_duplicatas: number
          numero: string
          original_genere: boolean
          paiement_id: string | null
          supprime_le: string | null
          supprime_par: string | null
          type: Database["public"]["Enums"]["type_recu"]
        }
        SetofOptions: {
          from: "*"
          to: "recus"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      espace_de: { Args: { p_id: string; p_table: string }; Returns: string }
      espace_public: { Args: { p_cle: string }; Returns: Json }
      est_appel_technique: { Args: never; Returns: boolean }
      est_super_admin: { Args: never; Returns: boolean }
      fcfa: { Args: { p_montant: number }; Returns: string }
      generation_recu: { Args: { p_recu: string }; Returns: Json }
      gestionnaire_de: { Args: { p_maison: string }; Returns: string[] }
      identifiant_pour_email: { Args: { p_email: string }; Returns: string }
      importer_reprise: {
        Args: { p_donnees: Json; p_espace: string }
        Returns: Json
      }
      initiales: { Args: { p_nom: string }; Returns: string }
      journaliser: {
        Args: {
          p_action: string
          p_cible_id?: string
          p_cible_table?: string
          p_details?: Json
          p_espace?: string
          p_libelle?: string
        }
        Returns: undefined
      }
      journaliser_echec_connexion: {
        Args: { p_identifiant: string }
        Returns: undefined
      }
      libelle_de: { Args: { p_id: string; p_table: string }; Returns: string }
      logement_occupe: {
        Args: { p_date: string; p_logement: string }
        Returns: boolean
      }
      loyer_du_mois: {
        Args: { p_bail: string; p_mois: string }
        Returns: number
      }
      maison_du_bail: { Args: { p_bail: string }; Returns: string }
      maison_du_logement: { Args: { p_logement: string }; Returns: string }
      marquer_notifications_lues: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      mettre_a_la_corbeille: {
        Args: { p_id: string; p_table: string }
        Returns: string
      }
      mfa_respectee: { Args: never; Returns: boolean }
      niveau_session: { Args: never; Returns: string }
      nom_de: { Args: { p_user: string }; Returns: string }
      nom_mois: { Args: { p_annee?: boolean; p_date: string }; Returns: string }
      notifier: {
        Args: {
          p_auteur_inclus?: boolean
          p_espace: string
          p_lien?: string
          p_message?: string
          p_titre: string
          p_type: string
          p_users: string[]
        }
        Returns: undefined
      }
      peut_gerer_espace: { Args: { p_espace: string }; Returns: boolean }
      peut_gerer_maison: { Args: { p_maison: string }; Returns: boolean }
      peut_modifier_locataire: {
        Args: { p_locataire: string }
        Returns: boolean
      }
      peut_voir_locataire: { Args: { p_locataire: string }; Returns: boolean }
      peut_voir_locataire_ligne: {
        Args: { p_espace: string; p_locataire: string }
        Returns: boolean
      }
      peut_voir_maison: { Args: { p_maison: string }; Returns: boolean }
      peut_voir_maison_ligne: {
        Args: { p_espace: string; p_gestionnaire: string; p_maison: string }
        Returns: boolean
      }
      proprietaires_de: { Args: { p_espace: string }; Returns: string[] }
      purger_audit: {
        Args: { p_avant?: string; p_ids?: number[] }
        Returns: number
      }
      purger_historique: {
        Args: { p_avant?: string; p_ids?: number[] }
        Returns: number
      }
      recalculer_recu_repris: {
        Args: { p_paiement: string }
        Returns: undefined
      }
      requete_entetes: { Args: never; Returns: Json }
      requete_ip: { Args: never; Returns: unknown }
      restaurer: { Args: { p_lot: string }; Returns: undefined }
      role_dans: {
        Args: { p_espace: string }
        Returns: Database["public"]["Enums"]["role_membre"]
      }
      situation_caution: { Args: { p_bail: string }; Returns: number }
      stats_baux: {
        Args: { p_espace: string; p_filtres?: Json }
        Returns: {
          date_debut: string
          date_fin: string
          gestionnaire_id: string
          id: string
          jour_echeance: number
          locataire: string
          locataire_id: string
          logement: string
          logement_id: string
          loyer: number
          maison: string
          maison_id: string
          telephone: string
          type: Database["public"]["Enums"]["type_logement"]
        }[]
      }
      stats_completes: {
        Args: {
          p_complet?: boolean
          p_debut: string
          p_espace: string
          p_filtres?: Json
          p_fin: string
        }
        Returns: Json
      }
      stats_logements: {
        Args: { p_espace: string; p_filtres?: Json }
        Returns: {
          cree_le: string
          designation: string
          gestionnaire_id: string
          id: string
          loyer_reference: number
          maison: string
          maison_id: string
          type: Database["public"]["Enums"]["type_logement"]
        }[]
      }
      stats_par_mois: {
        Args: {
          p_debut: string
          p_espace: string
          p_fin: string
          p_maison?: string
        }
        Returns: {
          attendu: number
          encaisse: number
          mois: string
        }[]
      }
      stats_resume: {
        Args: {
          p_debut: string
          p_espace: string
          p_fin: string
          p_maison?: string
        }
        Returns: Json
      }
      super_admins: { Args: never; Returns: string[] }
      supprimer_definitivement: {
        Args: { p_id: string; p_table: string }
        Returns: string[]
      }
      tables_corbeille: { Args: never; Returns: string[] }
      taches_quotidiennes: { Args: never; Returns: undefined }
      taille_journaux: { Args: never; Returns: Json }
      traiter_demande: {
        Args: { p_accepter: boolean; p_demande: string; p_reponse?: string }
        Returns: undefined
      }
      traiter_demande_acces: {
        Args: {
          p_accepter: boolean
          p_espace?: string
          p_id: string
          p_reponse?: string
        }
        Returns: undefined
      }
      utilisation_plateforme: { Args: never; Returns: Json }
      uuid_ou_null: { Args: { p: string }; Returns: string }
      valider_paiement_repris: {
        Args: { p_paiement: string }
        Returns: undefined
      }
      verifier_droit_suppression: {
        Args: { p_id: string; p_table: string }
        Returns: string
      }
      verifier_paiement_repris: {
        Args: { p_paiement: string }
        Returns: {
          a_verifier: string[]
          annule_le: string | null
          annule_par: string | null
          bail_id: string
          cle_idempotence: string
          cree_le: string
          cree_par: string | null
          date_paiement: string
          encaisse_par: string
          espace_id: string
          id: string
          lot_suppression: string | null
          mode: Database["public"]["Enums"]["mode_paiement"]
          modifie_le: string | null
          montant: number
          motif_annulation: string | null
          motif_remise: string | null
          payeur: string
          reference_transaction: string | null
          remise: number
          remplace_paiement_id: string | null
          reprise: Json | null
          statut: Database["public"]["Enums"]["statut_paiement"]
          supprime_le: string | null
          supprime_par: string | null
        }
        SetofOptions: {
          from: "*"
          to: "paiements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verifier_recu: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      formule: "decouverte" | "essentiel" | "pro" | "sur_mesure"
      mode_paiement:
        | "especes"
        | "mtn_momo"
        | "moov_money"
        | "celtiis_cash"
        | "virement"
        | "cheque"
        | "autre"
      role_membre: "proprietaire" | "gestionnaire" | "consultation"
      statut_demande: "en_attente" | "acceptee" | "refusee"
      statut_paiement: "valide" | "annule"
      type_logement:
        | "chambre"
        | "chambre_salon"
        | "appartement"
        | "boutique"
        | "magasin"
        | "bureau"
        | "autre"
      type_mvt_caution: "versement" | "remboursement" | "retenue"
      type_recu: "loyer" | "caution" | "restitution"
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
    Enums: {
      formule: ["decouverte", "essentiel", "pro", "sur_mesure"],
      mode_paiement: [
        "especes",
        "mtn_momo",
        "moov_money",
        "celtiis_cash",
        "virement",
        "cheque",
        "autre",
      ],
      role_membre: ["proprietaire", "gestionnaire", "consultation"],
      statut_demande: ["en_attente", "acceptee", "refusee"],
      statut_paiement: ["valide", "annule"],
      type_logement: [
        "chambre",
        "chambre_salon",
        "appartement",
        "boutique",
        "magasin",
        "bureau",
        "autre",
      ],
      type_mvt_caution: ["versement", "remboursement", "retenue"],
      type_recu: ["loyer", "caution", "restitution"],
    },
  },
} as const
