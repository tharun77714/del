import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedSparkleIconProps extends React.ComponentProps<typeof Sparkles> {}

export function AnimatedSparkleIcon({ className, ...props }: AnimatedSparkleIconProps) {
  return <Sparkles className={cn('animate-subtle-pulse', className)} {...props} />;
}
