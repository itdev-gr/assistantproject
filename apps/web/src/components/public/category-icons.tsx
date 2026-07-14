import {
  CarTaxiFront,
  Martini,
  MapPin,
  Mountain,
  PartyPopper,
  Sailboat,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@aga/ui';

const ICONS: Record<string, LucideIcon> = {
  restaurants: UtensilsCrossed,
  'bars-cafes': Martini,
  activities: Mountain,
  'boat-trips': Sailboat,
  taxis: CarTaxiFront,
  shops: ShoppingBag,
  events: PartyPopper,
};

export function categoryIcon(slug: string): LucideIcon {
  return ICONS[slug] ?? MapPin;
}

/** Image-area fallback when a business has no photos. */
export function CategoryGlyph({ slug, className }: { slug: string; className?: string }) {
  const Icon = categoryIcon(slug);
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-sky-200/60',
        className,
      )}
    >
      <Icon className="h-10 w-10 text-sky-700/50" aria-hidden strokeWidth={1.5} />
    </div>
  );
}
