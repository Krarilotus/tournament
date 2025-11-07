"use client";

import React, { useEffect, useState } from 'react';
import { useFieldArray, Control } from 'react-hook-form';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UpdateTournamentForm } from '../[id]/settings/page';

// --- The Draggable Item Component (SIMPLIFIED) ---
function SortableItem({ id, item, onRemove }: { id: string; item: string; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex w-full items-center justify-between rounded-md border bg-background p-2"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle is on ALL items */}
        <button
          type="button"
          {...listeners}
          className="cursor-grab rounded-md p-2 hover:bg-muted"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <span className="font-medium">{item}</span>
      </div>
      {/* Remove button is on ALL items */}
      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

// --- The Main D&D Component ---
interface TieBreakerDndProps {
  control: Control<UpdateTournamentForm>;
  customStats: string[];
}

export function TieBreakerDnd({ control, customStats }: TieBreakerDndProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'tieBreakers',
  });

  const [availableOptions, setAvailableOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState('');

  // --- "points" IS NOW IN THE LIST ---
  const builtInOptions = ['points', 'buchholz', 'buchholz2', 'directComparison'];

  useEffect(() => {
    const allStats = [
      ...builtInOptions,
      ...customStats.map(stat => `custom_${stat}`)
    ];
    
    const currentFields = fields.map(f => f.value);
    setAvailableOptions(allStats.filter(opt => !currentFields.includes(opt)));
  }, [customStats, fields]);

  const sensors = useSensors(useSensor(PointerSensor));

  // --- THE FIX ---
  // Simple, clean move logic. No more buggy 'if' statements.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
    }
  }
  // --- END OF FIX ---

  const handleAddOption = () => {
    if (selectedOption) {
      append({ value: selectedOption });
      setSelectedOption('');
    }
  };

  return (
    <div className="space-y-4">
      {/* --- Add New Tie-breaker --- */}
      <div className="flex gap-2">
        <Select value={selectedOption} onValueChange={setSelectedOption}>
          <SelectTrigger>
            <SelectValue placeholder="Select a tie-breaker..." />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map(opt => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="secondary" onClick={handleAddOption} disabled={!selectedOption}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {/* --- Sortable List --- */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <SortableItem
                key={field.id}
                id={field.id}
                item={field.value}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}