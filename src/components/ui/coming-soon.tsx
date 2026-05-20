import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description?: string;
  phase: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader className="items-center text-center">
          <Construction className="text-muted-foreground mx-auto h-10 w-10" />
          <CardTitle className="mt-4">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-center">
          <Badge variant="secondary">{phase}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
