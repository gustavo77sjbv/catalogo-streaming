import type { Metadata } from 'next';
import { TitleDetailsPage, titleDetailsMetadata } from '@/components/TitleDetailsPage';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return titleDetailsMetadata('filme', (await params).id);
}

export default async function FilmeDetailsPage({ params }: PageProps) {
  return <TitleDetailsPage tipo="filme" rawId={(await params).id} />;
}
