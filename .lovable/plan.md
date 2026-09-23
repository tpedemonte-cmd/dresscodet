# Menú de funciones en formato lista

## Objetivo
Reemplazar la ventana flotante actual por una pantalla de funciones inspirada en el menú “Más” de Mercado Libre, manteniendo el estilo visual de DressCode.

## Cambios
- Abrir “Funciones” como una vista de altura completa sobre la aplicación.
- Mostrar cada función en una fila grande con ícono, nombre y acceso táctil cómodo.
- Ordenar las opciones en grupos separados para facilitar el recorrido: principales, organización, compras y cuenta.
- Mantener los candados visibles en Plan y Viajes para cuentas gratuitas.
- Conservar la barra inferior visible, con “Funciones” resaltado mientras el menú esté abierto.
- Permitir desplazamiento vertical y cierre mediante una X o al elegir una función.
- Adaptar la misma vista a teléfono y computadora sin modificar las demás pantallas.

## Detalles técnicos
- Actualizar únicamente el menú dentro de `AppLayout`.
- Reutilizar los colores, tipografías, íconos y controles existentes.
- Verificar apertura, desplazamiento, navegación y cierre en tamaño móvil.
