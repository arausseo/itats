import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CvUploadZone } from "@/components/cv-upload-zone";
import { MAX_FILES } from "@/src/lib/upload-config";

export const metadata = { title: "Carga masiva de CVs — ATS" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/upload");

  return (
    <div className="min-h-full flex-1 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="border-border/80 shadow-sm ring-1 ring-border/60">
          <CardHeader className="border-b border-border/60 pb-6">
            <CardTitle className="text-lg sm:text-xl">
              Carga masiva de CVs
            </CardTitle>
            <CardDescription>
              Sube hasta {MAX_FILES} archivos PDF. Cada CV se procesará
              automáticamente con IA para extraer los datos del candidato y
              registrarlo en el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <CvUploadZone />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
