"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, ChevronDown, Plus, Star } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { FilterState } from "../filters/filter-sidebar";

interface SavedView {
  _id: Id<"savedViews">;
  name: string;
  description?: string;
  isShared: boolean;
  filters: Partial<FilterState>;
  columns: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface DefaultView {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  filters: Partial<FilterState>;
  columns: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ViewPickerProps {
  userId: Id<"users">;
  currentViewId?: string | Id<"savedViews">;
  onSelectView: (
    view: SavedView | DefaultView | null,
    viewId: string | Id<"savedViews"> | null,
  ) => void;
  onCreateView: () => void;
}

export function ViewPicker({
  userId,
  currentViewId,
  onSelectView,
  onCreateView,
}: ViewPickerProps) {
  const [open, setOpen] = useState(false);

  // Fetch default views
  const defaultViews = useQuery(api.savedViews.getDefaultViews);

  // Fetch user and shared views
  const savedViewsData = useQuery(api.savedViews.getSavedViews, { userId });

  const userViews = savedViewsData?.userViews ?? [];
  const sharedViews = savedViewsData?.sharedViews ?? [];
  const defaults = defaultViews ?? [];

  // Find current view name
  const getCurrentViewName = () => {
    if (!currentViewId) {
      return "All Items";
    }

    const defaultView = defaults.find((v) => v.id === currentViewId);
    if (defaultView) {
      return defaultView.name;
    }

    const userView = userViews.find((v) => v._id === currentViewId);
    if (userView) {
      return userView.name;
    }

    const sharedView = sharedViews.find((v) => v._id === currentViewId);
    if (sharedView) {
      return sharedView.name;
    }

    return "All Items";
  };

  const handleSelectView = (
    view: SavedView | DefaultView | null,
    viewId: string | Id<"savedViews"> | null,
  ) => {
    onSelectView(view, viewId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[160px]"
        >
          {getCurrentViewName()}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search views..." className="h-9" />
          <CommandList>
            <CommandEmpty>No views found.</CommandEmpty>

            {/* Default Views */}
            {defaults.length > 0 && (
              <>
                <CommandGroup heading="Pre-built Views">
                  {defaults.map((view) => (
                    <CommandItem
                      key={view.id}
                      value={view.name}
                      onSelect={() => handleSelectView(view, view.id)}
                    >
                      <Star className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-muted-foreground">
                            {view.description}
                          </div>
                        )}
                      </div>
                      <Check
                        className={`ml-2 h-4 w-4 ${
                          currentViewId === view.id
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* User Views */}
            {userViews.length > 0 && (
              <>
                <CommandGroup heading="My Views">
                  {userViews.map((view) => (
                    <CommandItem
                      key={view._id}
                      value={view.name}
                      onSelect={() => handleSelectView(view, view._id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-muted-foreground">
                            {view.description}
                          </div>
                        )}
                        {view.isShared && (
                          <div className="text-xs text-muted-foreground italic">
                            Shared
                          </div>
                        )}
                      </div>
                      <Check
                        className={`ml-2 h-4 w-4 ${
                          currentViewId === view._id
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Shared Views */}
            {sharedViews.length > 0 && (
              <>
                <CommandGroup heading="Shared Views">
                  {sharedViews.map((view) => (
                    <CommandItem
                      key={view._id}
                      value={view.name}
                      onSelect={() => handleSelectView(view, view._id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-muted-foreground">
                            {view.description}
                          </div>
                        )}
                      </div>
                      <Check
                        className={`ml-2 h-4 w-4 ${
                          currentViewId === view._id
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All Items (clear view) */}
            <CommandGroup>
              <CommandItem
                value="all-items"
                onSelect={() => handleSelectView(null, null)}
              >
                <div className="flex-1">
                  <div className="font-medium">All Items</div>
                  <div className="text-xs text-muted-foreground">
                    View all supply list items
                  </div>
                </div>
                <Check
                  className={`ml-2 h-4 w-4 ${
                    !currentViewId ? "opacity-100" : "opacity-0"
                  }`}
                />
              </CommandItem>
            </CommandGroup>

            {/* Create New View */}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={onCreateView}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Save Current View</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
