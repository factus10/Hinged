// Inline-editable table cell.
//
// Renders text by default. Double-click swaps in an <input>; Enter or blur
// commits the new value via onCommit, Esc cancels. The double-click
// interaction is local — it stops propagation so it doesn't disturb the
// row-selection click handlers on the surrounding <tr>.

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

interface Props {
  /** The current displayed value (string). Empty string renders as a thin dash. */
  value: string;
  /**
   * Called when the user commits a change. Receives the new raw string from
   * the input. Caller is responsible for parsing (e.g. number) and dispatching
   * the actual update mutation.
   */
  onCommit: (next: string) => void;
  /** Optional placeholder shown in the input when value is empty. */
  placeholder?: string;
  /** className applied to the rendered text in non-edit mode. */
  className?: string;
  /** Optional input type (e.g. 'number'). Defaults to 'text'. */
  type?: 'text' | 'number';
  /** Optional inline style for the rendered text. */
  style?: CSSProperties;
  /** When the cell is empty in display mode, render this string. Default '—'. */
  emptyText?: string;
}

export function EditableCell({
  value,
  onCommit,
  placeholder,
  className,
  type = 'text',
  style,
  emptyText = '—',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when external value changes (e.g. selection moved to a new
  // stamp while not editing).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-focus + select-all when entering edit mode.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Tab') {
      // Let Tab move focus naturally, but commit first.
      commit();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="editable-cell-input"
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        // Stop the input's clicks from bubbling to the row-click handler.
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`editable-cell ${className ?? ''}`}
      style={style}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Double-click to edit"
    >
      {value || <span className="editable-cell-empty">{emptyText}</span>}
    </span>
  );
}
