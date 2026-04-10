import { Card } from '@/components/ui/card';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: string;
  description?: string;
  highlight?: boolean;
}

export function StatsCard({ label, value, icon, description, highlight }: StatsCardProps) {
  return (
    <Card className={`p-4 ${highlight ? 'border-green-500/30 bg-green-900/5' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-3xl font-semibold tabular-nums ${highlight ? 'text-green-400' : 'text-foreground'}`}>
        {value}
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </Card>
  );
}
