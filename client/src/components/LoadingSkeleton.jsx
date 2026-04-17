export function CardSkeleton({ height = 200 }) {
  return (
    <div className="skeleton" style={{ height, borderRadius: 14 }} />
  );
}

export function TextSkeleton({ width = '100%', height = 16 }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 8 }} />
  );
}

export function GuideCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TextSkeleton width="60%" height={18} />
          <TextSkeleton width="40%" height={14} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <TextSkeleton width="25%" height={24} />
        <TextSkeleton width="25%" height={24} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <TextSkeleton width="30%" height={20} />
        <TextSkeleton width="25%" height={20} />
      </div>
    </div>
  );
}
