import HomeRuntime from './HomeRuntime';
import type { HomeProps } from '../types/home';

export default function Home({ onNavigate }: HomeProps) {
  return <HomeRuntime onNavigate={onNavigate} />;
}
