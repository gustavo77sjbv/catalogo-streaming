import type { Metadata } from 'next';
import { TitleDetailsPage, titleDetailsMetadata } from '@/components/TitleDetailsPage';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return titleDetailsMetadata('serie', (await params).id);
}

export default async function SerieDetailsPage({ params }: PageProps) {
  return <TitleDetailsPage tipo="serie" rawId={(await params).id} />;
}
