// ------------------------------------------------------------------
// drive-pleya — responsive file grid
// ------------------------------------------------------------------

interface Props {
  children: React.ReactNode;
}

export function FileGrid({ children }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {children}
    </div>
  );
}
