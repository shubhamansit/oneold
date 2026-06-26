"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical, RotateCcw } from "lucide-react";
import type { HmcColumnDef } from "@/lib/hmcJobData";
import {
  createDefaultPreferences,
  getHmcColumnDisplayLabel,
  getVisibleColumnCount,
  type HmcColumnPreference,
} from "@/lib/hmcColumnSettings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type HmcColumnSettingsDrawerProps = {
  allColumns: HmcColumnDef[];
  preferences: HmcColumnPreference;
  onPreferencesChange: (preferences: HmcColumnPreference) => void;
  onReset: () => void;
  disabled?: boolean;
};

type SortableColumnRowProps = {
  column: HmcColumnDef;
  isVisible: boolean;
  onToggle: (key: string, checked: boolean) => void;
};

function SortableColumnRow({
  column,
  isVisible,
  onToggle,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-white px-2 py-2",
        !isVisible && "bg-muted/40 opacity-70",
        isDragging && "z-10 border-dashed opacity-40"
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${getHmcColumnDisplayLabel(column)}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={isVisible}
        onCheckedChange={(checked) => onToggle(column.key, checked === true)}
        aria-label={`Toggle ${getHmcColumnDisplayLabel(column)}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {getHmcColumnDisplayLabel(column)}
        </p>
      </div>
    </div>
  );
}

function ColumnRowPreview({
  column,
  isVisible,
}: {
  column: HmcColumnDef;
  isVisible: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-white px-2 py-2 shadow-lg ring-2 ring-[#DB4848]/25",
        !isVisible && "bg-muted/40 opacity-70"
      )}
    >
      <div className="cursor-grabbing rounded p-1 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <Checkbox checked={isVisible} disabled />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {getHmcColumnDisplayLabel(column)}
        </p>
      </div>
    </div>
  );
}

export default function HmcColumnSettingsDrawer({
  allColumns,
  preferences,
  onPreferencesChange,
  onReset,
  disabled = false,
}: HmcColumnSettingsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const safePreferences = preferences ?? createDefaultPreferences(allColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columnMap = useMemo(
    () => new Map(allColumns.map((column) => [column.key, column])),
    [allColumns]
  );

  const orderedColumns = useMemo(
    () =>
      safePreferences.order
        .map((key) => columnMap.get(key))
        .filter((column): column is HmcColumnDef => Boolean(column)),
    [columnMap, safePreferences.order]
  );

  const hiddenSet = useMemo(
    () => new Set(safePreferences.hidden),
    [safePreferences.hidden]
  );

  const visibleCount = getVisibleColumnCount(safePreferences);
  const activeColumn = activeKey ? columnMap.get(activeKey) : null;

  const toggleColumn = (key: string, checked: boolean) => {
    const nextHidden = new Set(safePreferences.hidden);

    if (checked) {
      nextHidden.delete(key);
    } else if (visibleCount <= 1) {
      return;
    } else {
      nextHidden.add(key);
    }

    onPreferencesChange({
      ...safePreferences,
      hidden: [...nextHidden],
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveKey(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveKey(null);

    if (!over || active.id === over.id) return;

    const oldIndex = safePreferences.order.indexOf(String(active.id));
    const newIndex = safePreferences.order.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) return;

    onPreferencesChange({
      ...safePreferences,
      order: arrayMove(safePreferences.order, oldIndex, newIndex),
    });
  };

  const handleDragCancel = () => {
    setActiveKey(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !allColumns.length}
          className="h-10 gap-2 bg-white"
        >
          <Columns3 className="h-4 w-4" />
          Column Settings
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Column Settings</SheetTitle>
          <SheetDescription>
            Show, hide, and drag columns to reorder. Settings are saved in this
            browser.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between border-b pb-3">
          <p className="text-sm text-muted-foreground">
            {visibleCount} of {allColumns.length} columns visible
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <SortableContext
              items={orderedColumns.map((column) => column.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {orderedColumns.map((column) => (
                  <SortableColumnRow
                    key={column.key}
                    column={column}
                    isVisible={!hiddenSet.has(column.key)}
                    onToggle={toggleColumn}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeColumn ? (
              <ColumnRowPreview
                column={activeColumn}
                isVisible={!hiddenSet.has(activeColumn.key)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </SheetContent>
    </Sheet>
  );
}
