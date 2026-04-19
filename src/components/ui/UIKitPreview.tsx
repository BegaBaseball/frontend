import React from 'react';
import { Button } from './button';
import { Card } from './card';
import { useTheme } from '../../hooks/useTheme';

export default function UIKitPreview() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <header className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-4xl font-black text-primary">KBO Platform UI Kit</h1>
          <p className="text-muted-foreground mt-2">Design System & Component Library</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </Button>
      </header>

      {/* Typography Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">Typography</h2>
        <div className="grid gap-6 p-6 bg-muted/50 rounded-xl">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Pretendard (Sans)</p>
            <p className="text-3xl">The quick brown fox jumps over the lazy dog.</p>
            <p className="text-xl font-bold">다람쥐 헌 쳇바퀴에 타고파 (나랏말싸미)</p>
          </div>
          <div className="font-retro">
            <p className="text-sm text-neutral-500 mb-2 font-sans">Press Start 2P (Retro)</p>
            <p className="text-lg">KBO CHAMPIONSHIP 2026</p>
          </div>
          <div className="font-pixel">
            <p className="text-sm text-neutral-500 mb-2 font-sans">Galmuri (Pixel)</p>
            <p className="text-2xl">승리는 우리의 것! 베가 야구 플랫폼</p>
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch name="Primary" bg="bg-primary" text="text-primary-foreground" />
          <ColorSwatch name="Secondary" bg="bg-secondary" text="text-secondary-foreground" />
          <ColorSwatch name="Accent" bg="bg-accent" text="text-accent-foreground" />
          <ColorSwatch name="Destructive" bg="bg-destructive" text="text-destructive-foreground" />
          <ColorSwatch name="Muted" bg="bg-muted" text="text-muted-foreground" />
        </div>
      </section>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">Components - Buttons</h2>
        <div className="flex flex-wrap gap-4 p-6 border rounded-xl">
          <Button className="btn-brand">Brand Primary</Button>
          <Button variant="outline" className="btn-brand-outline">Brand Outline</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="link">Link Button</Button>
          <Button disabled>Disabled Button</Button>
        </div>
      </section>

      {/* Card Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">Components - Cards</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-2">Standard Card</h3>
            <p className="text-muted-foreground">This is a default card using our design system's border radius and subtle shadows.</p>
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Tag 1</span>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Tag 2</span>
            </div>
          </Card>
          
          <Card className="p-6 border-primary bg-primary/5">
            <h3 className="text-xl font-bold mb-2 text-primary">Featured Card</h3>
            <p className="text-muted-foreground">A highlighted card version with primary brand accents.</p>
            <Button size="sm" className="mt-4 btn-brand">Action</Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, bg, text }: { name: string; bg: string; text: string }) {
  return (
    <div className={`${bg} ${text} p-4 rounded-lg shadow-sm flex flex-col items-center justify-center aspect-square`}>
      <span className="font-bold">{name}</span>
      <span className="text-[10px] opacity-70">Variable</span>
    </div>
  );
}
