import { Card, CardContent, CardHeader, CardTitle } from '@aga/ui';

export default function AdminHomePage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Hotels</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">—</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Active partnerships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">—</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Messages today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">—</p>
        </CardContent>
      </Card>
    </div>
  );
}
