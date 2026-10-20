# DressCode roadmap

## Migración a infraestructura propia
- [x] Guardar de forma segura el acceso al proyecto propio y verificar servicios de cuentas y tablas existentes, sin cambiar la conexión activa.
- [x] Migrar cuentas, prendas, historial, planes, looks, wishlist y fotos al proyecto propio: datos remapeados a las cuentas del destino, URLs de imágenes reescritas al almacenamiento propio y tablas ai_usage_events, avatar_credits y avatar_generation_locks creadas con RLS y permisos.
- [ ] Conectar APK y Vercel al proyecto propio (variables VITE_SUPABASE_* del destino + redeploy/rebuild) y adaptar las funciones de IA para validar sesiones del destino manteniendo el cobro de IA en Lovable. No modificar ni eliminar el origen hasta verificar todo.

## Prueba visual
- [x] Usar medias negras en la representación de la categoría para mejorar su visibilidad (verificado en Agregar)
- [x] Extender imágenes e íconos a todos los emojis visibles, incluidos textos de Looks guardados, Armario, formularios, clima e historial (12 pantallas verificadas sin emojis visibles)
- [x] Tienda: probar imágenes realistas en las categorías; Outfit y Plan semanal: íconos simples para ocasiones, con opción de restaurar el aspecto anterior (imágenes y selección verificadas)

## Hecho
- [x] Probador: actualizar ambos contadores inmediatamente al confirmar un outfit generado, sin esperar la consulta de cupos
- [x] Probador: conservar el avatar sin guardar y el estado al cambiar de solapa, sin consumir otra generación
- [x] Probador: altura, peso y edad arrancan vacíos con placeholder gris claro y usan defaults (170, 65, 28) al generar
- [x] Probador: género arranca en opción "Seleccioná uno" y luego permite masculino/femenino
- [x] Probador Premium: "O sacarte una foto" arriba del avatar y en color naranja del tema
- [x] Probador Premium: al tocar "O sacarte una foto" se puede abrir la cámara o elegir una foto de la galería
- [x] Feedback: cada 5 outfits distintos opinados aparece "¡Gracias! Tu opinión ayuda a la IA a aprender tus gustos."; repetir opinión en el mismo outfit no suma

## Planes y avatares
- [x] Premium: separar usos gratis y pagos; iniciar con 15/mes y 5/día, conservar modelo y créditos y mostrar ambos contadores
- [x] Premium: permitir eliminar sin créditos y confirmar antes de borrar el último avatar; mantener regeneración con packs
- [x] Bloquear modelo gratis guardado, habilitar borrado solo con créditos y consumir uno por reemplazo exitoso
- [x] Plan gratis: 1 modelo generado + 1 modelo guardado; 3 pruebas de outfit por mes
- [x] Premium: una generación inicial con 3 opciones, un único modelo guardado; reemplazos solo con packs
- [x] Compra de avatares extra: 1 x USD 0,99 y pack de 3 x USD 1,99 (pago simulado)
- [x] Altura mínima 150 cm y peso mínimo 45 kg en el formulario del modelo (aviso en la app y control también en el backend)
- [x] Probador: al tocar "Generar con IA" sin tener el modelo guardado, avisa "Guardá el modelo primero" (el botón queda atenuado pero sigue tocable, y no gasta pruebas)
- [x] Probador: la foto subida se endereza antes de enviarla a la IA (antes salía el outfit torcido), el resultado horizontal se muestra completo sin cortar la cabeza, y el fondo de habitación se reemplaza por uno de estudio
