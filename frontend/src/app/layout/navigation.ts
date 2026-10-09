import { FileText, Home, ReceiptText, Users, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  /** Sin ruta, el módulo aún no existe y se muestra como "Pronto". */
  to?: string;
}

export const NAVIGATION: readonly NavigationItem[] = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Colaboradores', icon: Users },
  { label: 'Planillas', icon: ReceiptText },
  { label: 'Reportes', icon: FileText },
];
