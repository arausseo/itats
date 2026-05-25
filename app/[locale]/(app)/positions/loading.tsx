import { getLocale, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default async function PositionsLoading() {
  const locale = await getLocale();
  setRequestLocale(locale);

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-24">
            <Spinner className="h-10 w-10 text-primary" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
