import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { title: "Iniciar sesión — ATS" };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm border-border/80 shadow-sm ring-1 ring-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">ATS — Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </div>
  );
}
