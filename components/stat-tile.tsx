import { Card, CardContent } from "@/components/ui/card";

// One number a dashboard leads with: a label, the value itself (bold, no
// comma-aligned tabular digits — those are for columns, not a lone big
// number), and an optional second line of context.
export function StatTile({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        {secondary && (
          <p className="mt-1 text-sm text-muted-foreground">{secondary}</p>
        )}
      </CardContent>
    </Card>
  );
}
