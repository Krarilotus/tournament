"use client";

// We need SubmitHandler
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createTournamentSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Infer the form type from our Zod schema
type CreateTournamentForm = z.infer<typeof createTournamentSchema>;

export default function CreateTournamentPage() {
  const router = useRouter();

  const form = useForm<CreateTournamentForm>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      customStats: [],
      tieBreakers: [{ value: 'points' }],
    },
  });

  const onSubmit: SubmitHandler<CreateTournamentForm> = async (values) => {
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error('Failed to create tournament. Please try again.');
      }

      toast.success('Tournament created successfully!');
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Tournament</CardTitle>
            <CardDescription>
              Fill out the basic details for your tournament.
              You can configure advanced settings later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* --- Basic Info --- */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Weekly Swiss'" {...field} />
                  </FormControl>
                  <FormDescription>
                    The public name of your tournament.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short description of your event."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be shown on the public tournament page.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator />

            {/* --- Scoring Settings --- */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Scoring</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pointsWin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points for a Win</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          {...form.register(field.name, { valueAsNumber: true })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pointsDraw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points for a Draw</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          {...form.register(field.name, { valueAsNumber: true })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pointsLoss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points for a Loss</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          {...form.register(field.name, { valueAsNumber: true })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create Tournament'}
        </Button>
      </form>
    </Form>
  );
}