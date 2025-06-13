import { UserTypeSelection } from '@/components/landing/user-type-selection';
import { AnimatedSparkleIcon } from '@/components/common/animated-sparkle-icon';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-secondary/30">
      <div className="text-center mb-12">
        <div className="inline-block p-4 rounded-full bg-primary/20 mb-6">
          <AnimatedSparkleIcon className="h-16 w-16 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight text-foreground">
          Welcome to Sparkle Studio
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your premier destination for discovering unique jewelry and connecting with talented artisans. Choose your path to begin.
        </p>
      </div>
      
      <UserTypeSelection />

      <footer className="absolute bottom-8 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Sparkle Studio. Curating brilliance, one piece at a time.</p>
      </footer>
    </main>
  );
}
