import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@renderer/components/primitives';
import { useCreateStamp, useSettings } from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';

interface Props {
  albumId: number;
}

export function QuickAddRow({ albumId }: Props) {
  const createStamp = useCreateStamp();
  const { data: settings } = useSettings();
  const { setSingleStamp } = useSelection();

  const [catalogNumber, setCatalogNumber] = useState('');
  const [year, setYear] = useState('');
  const [denomination, setDenomination] = useState('');
  const catalogRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // When the user switches albums, clear any in-progress quick-add.
    setCatalogNumber('');
    setYear('');
    setDenomination('');
  }, [albumId]);

  const submit = async () => {
    const cn = catalogNumber.trim();
    if (!cn) return;
    const created = await createStamp.mutateAsync({
      albumId,
      catalogNumber: cn,
      yearStart: year ? Number(year) || null : null,
      denomination: denomination.trim(),
      gumConditionRaw: settings?.defaultGumConditionRaw || 'unspecified',
      centeringGradeRaw: settings?.defaultCenteringGradeRaw || 'unspecified',
      collectionStatusRaw: settings?.defaultCollectionStatusRaw || 'owned',
    });
    setSingleStamp(created.id);
    setCatalogNumber('');
    setYear('');
    setDenomination('');
    // Refocus the catalog number for rapid entry
    catalogRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    } else if (e.key === 'Escape') {
      setCatalogNumber('');
      setYear('');
      setDenomination('');
    }
  };

  return (
    <div className="quick-add-row" role="group" aria-label="Quick add stamp">
      <span className="quick-add-label subtle small">Add:</span>
      <Input
        ref={catalogRef}
        placeholder="Catalog #"
        value={catalogNumber}
        onChange={(e) => setCatalogNumber(e.target.value)}
        onKeyDown={onKeyDown}
        className="quick-add-catalog"
      />
      <Input
        placeholder="Year"
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        onKeyDown={onKeyDown}
        className="quick-add-year"
      />
      <Input
        placeholder="Denomination"
        value={denomination}
        onChange={(e) => setDenomination(e.target.value)}
        onKeyDown={onKeyDown}
        className="quick-add-denom"
      />
      <span className="subtle small">Press Enter to add</span>
    </div>
  );
}
