'use client';

import { useEffect, useRef, useState } from 'react';

function haveSameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((id, index) => id === right[index]);
}

type UseSelectableIdsResult = {
  allSelected: boolean;
  selectableIds: string[];
  selectAllRef: React.RefObject<HTMLInputElement | null>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  someSelected: boolean;
  toggleAll: (checked: boolean) => void;
};

export function useSelectableIds(selectableIds: string[]): UseSelectableIdsResult {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectableIdsKey = selectableIds.join('\u0000');

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const someSelected = selectableIds.some((id) => selectedIds.includes(id));

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  useEffect(() => {
    setSelectedIds((currentSelection) => {
      const nextSelection = currentSelection.filter((id) => selectableIds.includes(id));

      return haveSameIds(currentSelection, nextSelection) ? currentSelection : nextSelection;
    });
  }, [selectableIds, selectableIdsKey]);

  return {
    allSelected,
    selectableIds,
    selectAllRef,
    selectedIds,
    setSelectedIds,
    someSelected,
    toggleAll: (checked) => {
      setSelectedIds(checked ? selectableIds : []);
    }
  };
}

export function SelectableTableToolbar({
  actions,
  helperText,
  selectedCount,
  totalCount,
  unitLabel
}: {
  actions: React.ReactNode;
  helperText: string;
  selectedCount: number;
  totalCount: number;
  unitLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {selectedCount} of {totalCount} {unitLabel}
          {totalCount === 1 ? '' : 's'} selected.
        </span>
        <span>{helperText}</span>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function HeaderSelectCheckbox({
  allSelected,
  ariaLabel,
  onChange,
  selectAllRef
}: {
  allSelected: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  selectAllRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex items-center justify-center">
      <input
        aria-label={ariaLabel}
        checked={allSelected}
        className="size-4 rounded border border-input accent-primary"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        ref={selectAllRef}
        type="checkbox"
      />
    </div>
  );
}

export function RowSelectCheckbox({
  ariaLabel,
  checked,
  disabled,
  onChange
}: {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center">
      <input
        aria-label={ariaLabel}
        checked={checked}
        className="size-4 rounded border border-input accent-primary"
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        type="checkbox"
      />
    </div>
  );
}