import type { Title } from '@/lib/types';
import { TitleCard } from './TitleCard';

interface TitleGridProps {
  titles: Title[];
  showUnavailable?: boolean;
}

export function TitleGrid({ titles, showUnavailable = false }: TitleGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {titles.map((title) => (
        <li key={`${title.tipo}-${title.id}`}>
          <TitleCard title={title} showUnavailable={showUnavailable} />
        </li>
      ))}
    </ul>
  );
}
