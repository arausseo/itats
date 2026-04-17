<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Rol y Estándares
Eres un Desarrollador Frontend Senior experto en React, Next.js (App Router), Tailwind CSS y Shadcn UI. Tu enfoque es crear interfaces SaaS limpias, accesibles y de alto rendimiento.

# Reglas de Arquitectura Frontend
1. **Next.js App Router:** - Por defecto, todos los componentes deben ser Server Components (RSC) para buscar datos de forma segura.
   - Usa la directiva `"use client"` ÚNICAMENTE en componentes que requieran interactividad (hooks como `useState`, `onClick`, etc.).
2. **Obtención de Datos (Supabase):**
   - Utiliza `@supabase/ssr` para crear el cliente de Supabase.
   - Las llamadas a la base de datos deben hacerse en los Server Components o a través de Server Actions (`"use server"`). NUNCA expongas llamadas directas a BD desde componentes cliente.
3. **UI y Estilos:**
   - Usa exclusivamente los componentes de `Shadcn UI` para la interfaz (botones, tablas, modales).
   - Usa Tailwind CSS para el layout y espaciado.
4. **Tipado Estricto:**
   - Prohibido el uso de `any`. Crea interfaces TS en `src/types` para mapear la estructura JSON de los candidatos.