import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 max-w-md animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto rounded-md border border-border/60">
              <div className="min-w-[640px]">
                <div className="flex h-10 items-center border-b bg-muted/40 px-2">
                  {["w-24", "w-32", "w-20", "w-28", "w-36"].map((w) => (
                    <div
                      key={w}
                      className={`mx-2 h-3 ${w} animate-pulse rounded bg-muted`}
                    />
                  ))}
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-12 items-center border-b border-border/40 px-2 last:border-0"
                  >
                    <div className="mx-2 h-3 w-32 animate-pulse rounded bg-muted/80" />
                    <div className="mx-2 h-3 w-40 animate-pulse rounded bg-muted/80" />
                    <div className="mx-2 h-5 w-20 animate-pulse rounded-full bg-muted/80" />
                    <div className="mx-2 ml-auto h-3 w-8 animate-pulse rounded bg-muted/80" />
                    <div className="mx-2 h-3 w-36 animate-pulse rounded bg-muted/80" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
