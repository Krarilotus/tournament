"use client";

// 1. import all the shadn components....
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { updateTournamentSchema } from '@/lib/validators';
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
import { Badge } from '@/components/ui/badge';
import { X, Loader2, ArrowLeft } from 'lucide-react';
import React, { useEffect, useState, use } from 'react';
import { TieBreakerDnd } from '../../components/TieBreakerDnd'; 

// 2. Export the form type (this is correct)
export type UpdateTournamentForm = z.infer<typeof updateTournamentSchema>;

export default function TournamentSettingsPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [statInput, setStatInput] = useState('');
  
  const form = useForm<UpdateTournamentForm>({
    resolver: zodResolver(updateTournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      pointsWin: 0,
      pointsDraw: 0,
      pointsLoss: 0,
      customStats: [],
      tieBreakers: [], 
    },
  });

  const customStats = form.watch('customStats');

  useEffect(() => {
    if (!params.id) return;

    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch tournament');
        
        const data = await res.json();
        
        const dbTiebreakers = data.settings.tieBreakers || [];
        const tiebreakersToLoad = dbTiebreakers.length > 0
          ? dbTiebreakers
          : ['points'];

        form.reset({
          name: data.name,
          description: data.description,
          pointsWin: data.settings.pointsWin,
          pointsDraw: data.settings.pointsDraw,
          pointsLoss: data.settings.pointsLoss,
          customStats: data.settings.customStats,
          tieBreakers: tiebreakersToLoad.map((val: string) => ({ value: val })),
        });

      } catch (error) {
        console.error(error);
        toast.error('Could not load tournament data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [params.id, form]);

  const handleAddStat = () => {
    if (statInput.trim()) {
      const currentStats = form.getValues('customStats') || [];
      const newStat = statInput.trim();
      
      if (!currentStats.includes(newStat)) {
        form.setValue('customStats', [...currentStats, newStat]);
        setStatInput('');
      } else {
        toast.warning('This stat already exists.');
      }
    }
  };

  const handleRemoveStat = (statToRemove: string) => {
    const currentStats = form.getValues('customStats') || [];
    form.setValue('customStats', currentStats.filter(s => s !== statToRemove));
  };
  
  const onSubmit: SubmitHandler<UpdateTournamentForm> = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        settings: {
          pointsWin: values.pointsWin,
          pointsDraw: values.pointsDraw,
          pointsLoss: values.pointsLoss,
          customStats: values.customStats,
          tieBreakers: values.tieBreakers ? values.tieBreakers.map(t => t.value) : [],
        }
      };

      const res = await fetch(`/api/tournaments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update tournament');
      
      toast.success('Tournament settings saved!');
      router.refresh();
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'An error occurred. Please try again.');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button asChild variant="outline">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* ... (Basic Info Card) ... */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ... (Scoring Card) ... */}
          <Card>
            <CardHeader><CardTitle>Scoring System</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
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
            </CardContent>
          </Card>
          
          {/* ... (Custom Stats Card) ... */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Statistics</CardTitle>
              <CardDescription>
                Define custom stats to track (e.g., "Kills", "Flags").
                This will add fields to match reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="New stat name"
                  value={statInput}
                  onChange={(e) => setStatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStat();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddStat}>
                  Add
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {form.watch('customStats')?.map((stat) => (
                  <Badge key={stat} variant="secondary">
                    {stat}
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => handleRemoveStat(stat)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {stat}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tie-Breaker Priority</CardTitle>
              <CardDescription>
                Drag and drop to set the priority. "Points" is always locked to the top.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TieBreakerDnd
                control={form.control}
                customStats={customStats || []}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Settings'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}