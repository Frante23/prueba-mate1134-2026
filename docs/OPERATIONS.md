# Manual de operación

## Acceso

El portal docente se abre agregando `/admin` al dominio de producción. Las credenciales están en la configuración protegida de Vercel y no deben documentarse en el repositorio.

El panel carga respuestas y se actualiza cada cinco segundos. “Actualizar ahora” fuerza una lectura. “Cerrar sesión” limpia de memoria credenciales y datos.

## Interpretación

- **Total**: correos institucionales únicos con voto vigente.
- **Asistirán**: correos cuyo último envío fue `yes`.
- **No asistirán**: correos cuyo último envío fue `no`.
- **Última actualización**: fecha del registro vigente más reciente.

Un reenvío puede mover una unidad entre Sí y No, pero no aumenta el total.

## Eliminar un voto

1. Localizar al estudiante en la tabla.
2. Presionar “Eliminar voto”.
3. Revisar nombre y correo en la confirmación.
4. Confirmar la acción.
5. Esperar el mensaje verde y verificar que desaparezca.

La operación elimina todas las versiones bajo el hash del correo, incluidas las variantes históricas Sí y No. No hay papelera; si se borra por error, el estudiante debe volver a responder.

La eliminación admite votos históricos cuyo usuario ya no cumple la regla de año, siempre que el dominio sea exactamente `alu.uct.cl`. Así se pueden sanear pruebas antiguas sin volver a aceptarlas en el formulario.

## Exportar CSV

“Descargar CSV” genera `votos-mate1134.csv` con nombre, correo, voto y última actualización localizada. Incluye BOM UTF-8 para que Excel reconozca tildes y eñes. Antes de descargar se recomienda “Actualizar ahora”.

## Publicar una versión

1. Confirmar que Git contiene solo cambios previstos.
2. Ejecutar `npm run build`.
3. Revisar TypeScript y rutas.
4. Comprobar que no hay secretos en el diff.
5. Crear commits convencionales descriptivos.
6. Subir `main` al repositorio oficial.
7. Ejecutar `vercel deploy --prod --yes`.
8. Verificar producción.

## Prueba de humo

### Formulario

- Abrir a 320 px y a ancho de escritorio.
- Confirmar que el botón parte deshabilitado.
- Escribir nombre incompleto: sigue bloqueado.
- Probar `francooyarzo12`: se rechaza.
- Probar `foyarzo2023` o `franco.oyarzo2023`: se acepta.
- Elegir Sí o No, enviar y confirmar el mensaje válido.

### Unicidad

- Registrar un correo de control con Sí.
- Anotar Total, Sí y No.
- Enviar el mismo correo con No.
- Confirmar que el total no cambia.
- Confirmar que los contadores se redistribuyen.
- Confirmar una sola fila en el panel.
- Eliminar el registro de control.

### Administración

- Probar credenciales incorrectas: no entrega datos.
- Ingresar con credenciales válidas.
- Comparar agregados del panel y portada.
- Descargar y abrir CSV.
- Eliminar un voto de control y verificar el total público.

## Rotación de credenciales

1. Cambiar `ADMIN_EMAIL` y/o `ADMIN_PASSWORD` en Vercel.
2. Desplegar producción nuevamente.
3. Verificar la combinación nueva.
4. Confirmar que la anterior recibe HTTP 401.

Nunca dejar el valor en historial del shell, documentación, capturas, commits o código.

## Diagnóstico

### Panel no configurado

Falta una variable de administración. Revisar `ADMIN_EMAIL` y `ADMIN_PASSWORD` y redesplegar.

### No se guardan votos

Revisar `BLOB_READ_WRITE_TOKEN`, el almacén y los logs de `/api/responses`. El navegador recibe un error genérico para no exponer detalles.

### Un voto antiguo no se borra

Confirmar que termina exactamente en `@alu.uct.cl`. La API no elimina objetivos fuera del dominio institucional.

### Porcentajes atrasados

Esperar el sondeo o actualizar manualmente. La portada consulta cada 3,5 segundos y el panel cada 5. Las API usan `no-store`.

### Vercel funciona pero GitHub está vacío

Verificar el remoto exacto `Frante23/prueba-mate1134-2026`, la rama `main` y que el SHA local coincida con `refs/heads/main` remoto. Desplegar en Vercel no equivale a hacer push a GitHub.

## Recuperación

Los votos eliminados no son recuperables desde la interfaz. Ante una eliminación accidental, identificar al estudiante, pedir un nuevo envío y comprobar que reaparece una sola fila.

Ante un despliegue defectuoso, se puede promover en Vercel el último despliegue estable y corregir `main` mediante un commit nuevo. No se recomienda reescribir historial compartido.
