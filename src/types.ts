export type Card = {
  id: string;
  name: string;
  type: string;
  last4: string;
  exp: string;
  note: string;
  color: string;
  /** Percorso locale della foto (file:///...) */
  localImage: string | null;
  /** Percorso della foto sul server (dopo l'upload) */
  image_path: string | null;
  balance: number | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

export type CardInput = Partial<Pick<Card, 'name' | 'type' | 'last4' | 'exp' | 'note' | 'color' | 'localImage'>>;
