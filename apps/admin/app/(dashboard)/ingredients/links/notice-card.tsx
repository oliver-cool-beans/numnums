import { Card, CardContent } from '@/components/ui/card';

export function NoticeCard({ tone, message }: { tone: 'notice' | 'error'; message: string }) {
  return (
    <Card className={tone === 'error' ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}>
      <CardContent className="p-4 text-sm font-medium text-foreground">{message}</CardContent>
    </Card>
  );
}