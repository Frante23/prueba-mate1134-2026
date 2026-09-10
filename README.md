# Confirmación de asistencia MATE1134 · 2026

Aplicación web responsiva para consultar a estudiantes de la Universidad Católica de Temuco si asistirán a una evaluación. Registra nombre completo, correo institucional y respuesta, publica porcentajes agregados en vivo y entrega al equipo docente un panel privado con detalle individual.

- Sitio público: `https://confirmacion-evaluacion-uct-2026.vercel.app/`
- Panel docente: `https://confirmacion-evaluacion-uct-2026.vercel.app/admin`
- Repositorio oficial: `https://github.com/Frante23/prueba-mate1134-2026`

## Funcionalidades

### Portal del estudiante

- Tres campos obligatorios: nombre completo, usuario institucional y asistencia.
- Dominio `@alu.uct.cl` fijo para evitar dominios mal escritos.
- Validación inmediata en el navegador y repetida en el servidor.
- Botón bloqueado hasta completar válidamente todos los campos.
- Respuestas excluyentes `Sí, asistiré` y `No asistiré`.
- Confirmación visual únicamente después de persistir el voto.
- Totales y porcentajes consultados automáticamente cada 3,5 segundos.
- Diseño adaptable a escritorio, tablet y teléfono.
- La portada no enlaza ni expone visualmente el panel docente.

### Panel docente

- Ruta independiente `/admin`.
- Inicio de sesión mediante secretos de entorno.
- Resumen de afirmativos, negativos, total y porcentajes.
- Tabla con nombre, correo, voto y última actualización.
- Actualización automática cada 5 segundos y actualización manual.
- Exportación CSV compatible con UTF-8 y Excel.
- Eliminación confirmada de votos actuales y heredados.
- Tabla convertida en fichas legibles en pantallas pequeñas.

## Regla de un voto por correo

La identidad es el correo normalizado: se eliminan espacios exteriores y se convierte a minúsculas. Se calcula un SHA-256 truncado usado como clave privada:

```text
attendance-v1/<hash-del-correo>/record-<version-unica>.json
```

Si el estudiante responde nuevamente, se publica una versión con URL inmutable y se limpian las versiones previas. El segundo envío no aumenta el total; la respuesta, nombre y fecha nuevos reemplazan lógicamente a los anteriores; mayúsculas o espacios no crean duplicados; y el panel muestra como máximo una fila por identidad.

El lector reduce siempre por hash y conserva la versión más reciente. Esto evita duplicados incluso ante solicitudes simultáneas y durante la transición desde esquemas anteriores (`yes.json`, `no.json` o `record.json`). Las URL versionadas evitan servir durante unos segundos contenido antiguo desde la caché de Blob.

## Validación del correo

| Formato | Ejemplo | Resultado |
| --- | --- | --- |
| Inicial + apellido + año | `foyarzo2023@alu.uct.cl` | Válido |
| Nombre.apellido + año | `franco.oyarzo2023@alu.uct.cl` | Válido |
| Año de dos dígitos | `foyarzo23@alu.uct.cl` | Rechazado |
| Usuario demasiado corto | `oy2023@alu.uct.cl` | Rechazado |
| Dominio distinto | `foyarzo2023@gmail.com` | Rechazado |
| Patrón antiguo incorrecto | `francooyarzo12@alu.uct.cl` | Rechazado al votar |

El año debe estar entre 2000 y el año actual. La eliminación administrativa utiliza una validación distinta y deliberadamente más tolerante: exige el dominio UCT, pero permite borrar registros antiguos creados antes de la regla vigente.

## Arquitectura

```text
Navegador estudiante ── POST /api/responses ──┐
                    └── GET  /api/results ────┼── Vercel Blob privado
Navegador docente ──── POST /api/teacher ─────┤
                    └── DELETE /api/teacher ──┘
```

La aplicación usa Next.js App Router, React y TypeScript. Las páginas se prerenderizan; las API son dinámicas y desactivan caché para reflejar el estado vigente. Los datos personales no se incluyen en `/api/results`, que solo responde agregados.

Más detalle en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y el procedimiento de administración en [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Contratos de API

| Método | Ruta | Acceso | Propósito |
| --- | --- | --- | --- |
| `GET` | `/api/results` | Público | Entrega conteos y porcentajes, nunca identidades. |
| `POST` | `/api/responses` | Público validado | Crea o actualiza el único voto de un correo. |
| `POST` | `/api/teacher` | Credenciales | Entrega resumen y detalle individual. |
| `DELETE` | `/api/teacher` | Credenciales | Elimina todas las variantes del voto indicado. |

Ejemplo de voto:

```json
{
  "name": "Franco Oyarzo Calisto",
  "email": "foyarzo2023@alu.uct.cl",
  "answer": "yes"
}
```

La respuesta exitosa incluye `mode: "created-or-updated"` para declarar que un mismo correo se crea una vez y después se actualiza.

## Seguridad y privacidad

- Los datos se guardan en Vercel Blob con acceso privado.
- Las credenciales nunca se incluyen en el JavaScript inicial ni en Git.
- La autenticación se ejecuta en servidor y compara secretos con `timingSafeEqual`.
- El correo no forma parte del nombre del archivo; se utiliza un hash.
- El endpoint público entrega solo cantidades agregadas.
- Hay encabezados contra MIME sniffing, framing y acceso innecesario a sensores.
- `.env.local` y `.vercel` están ignorados por Git.

El acceso sencillo por credenciales sirve para el alcance actual. Para múltiples docentes se recomienda migrar a sesiones firmadas, proveedor de identidad y auditoría individual.

## Desarrollo local

Requisitos: Node.js 20 o superior, un almacén privado de Vercel Blob y variables válidas.

```bash
npm install
copy .env.example .env.local
npm run dev
```

```dotenv
BLOB_READ_WRITE_TOKEN=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

No se deben escribir valores reales en `.env.example`, documentación, commits, incidencias ni capturas públicas.

## Verificación y despliegue

```bash
npm run build
vercel deploy --prod --yes
```

Después de publicar se ejecuta la lista de control de `docs/OPERATIONS.md`: validación estricta, actualización del mismo correo, porcentajes, acceso docente, exportación y eliminación.

## Estructura principal

```text
app/
  page.tsx                 formulario y resultados de estudiantes
  admin/page.tsx           acceso, métricas, CSV y detalle docente
  api/responses/route.ts   escritura validada
  api/results/route.ts     agregados públicos
  api/teacher/route.ts     lectura privada y eliminación
  globals.css              sistema visual responsivo
components/
  results-card.tsx         porcentajes reutilizables
lib/
  validation.ts            normalización y reglas de identidad
  store.ts                 persistencia, unicidad y agregación
docs/
  ARCHITECTURE.md          diseño técnico e invariantes
  OPERATIONS.md            operación, despliegue y recuperación
CHANGELOG.md               historial funcional
```

## Criterios de aceptación

1. Ningún voto se guarda con campos incompletos.
2. Un correo que no cumple el patrón vigente recibe HTTP 400.
3. Un correo normalizado genera una fila y un voto activo.
4. Cambiar de Sí a No conserva el total y actualiza los contadores.
5. La portada no revela correos ni nombres de terceros.
6. `/admin` no entrega datos con credenciales incorrectas.
7. El administrador puede borrar un registro UCT heredado inválido para nuevos envíos.
8. La interfaz sigue siendo utilizable a 320 px de ancho.
