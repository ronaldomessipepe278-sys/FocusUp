# FocusUp

Aplicación web de productividad y estudio: tareas, Pomodoro, calendario, objetivos y estadísticas.
Todo se guarda en el `localStorage` del navegador (sin cuentas ni servidor).

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # comprobación de tipos + compilación de producción en dist/
npm run preview    # sirve la versión compilada
```

## Estructura

```
src/
  types.ts              Modelos de datos
  lib/                  Lógica pura: fechas, almacenamiento versionado, temporizador, estadísticas
  store/                Estado global (reducer), temporizador y formularios globales
  hooks/                Enrutado por hash, acciones de tareas, celebración de objetivos
  components/           UI reutilizable, layout, tareas, objetivos, asignaturas, gráficos
  pages/                Dashboard, Tareas, Temporizador, Calendario, Estadísticas, Ajustes
```

## Datos

- Clave `focusup.data` con `schemaVersion` (actualmente 1). Las migraciones van en `migrate()` de `src/lib/storage.ts`.
- Al cargar se valida cada registro; los dañados se descartan sin afectar al resto.
  Si el JSON entero es ilegible, se guarda una copia en `focusup.data.corrupt-<timestamp>`.
- Exportar/importar copias JSON desde Ajustes (con validación y confirmación).

## Reglas del temporizador

- El tiempo restante se calcula con marcas de tiempo (`endAt - ahora`), no restando segundos.
- Sesión completada: período de concentración que llega a 0; suma su duración completa.
- Saltar o cambiar de modo tras ≥ 1 min registra el tiempo efectivo como sesión parcial.
- Reiniciar descarta el período. Los descansos no suman tiempo.
- Cada período tiene un id único que se usa como id de la sesión: no puede registrarse dos veces.
