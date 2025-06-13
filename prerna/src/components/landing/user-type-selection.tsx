
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedSparkleIcon } from '@/components/common/animated-sparkle-icon';
import Link from 'next/link';

export function UserTypeSelection() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <div className="p-3 bg-accent/10 rounded-full mb-3">
            <Users className="h-10 w-10 text-accent" />
          </div>
          <CardTitle className="font-headline text-2xl">For Individuals</CardTitle>
          <CardDescription>
            Discover unique pieces, connect with designers, and find inspiration for your next treasured item.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            size="lg"
            className="w-full md:w-auto btn-accent-sparkle font-semibold text-lg py-6 px-8"
            variant="default"
            style={{ '--accent-foreground': 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } as React.CSSProperties}
            asChild
          >
            <Link href="/auth/individual/signin"> 
              <AnimatedSparkleIcon className="mr-2 h-5 w-5" /> Explore as Individual
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center">
          <div className="p-3 bg-primary/10 rounded-full mb-3">
            <Briefcase className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">For Businesses</CardTitle>
          <CardDescription>
            Showcase your collections, manage your network, and reach a passionate audience of jewelry lovers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button
            size="lg"
            className="w-full md:w-auto btn-primary-sparkle font-semibold text-lg py-6 px-8"
            variant="default"
            asChild
          >
             <Link href="/auth/business/signin"> 
               <AnimatedSparkleIcon className="mr-2 h-5 w-5" /> Join as Business
             </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
