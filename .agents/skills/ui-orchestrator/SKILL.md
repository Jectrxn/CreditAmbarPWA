---
name: ui-orchestrator
description: Orquestador maestro de UX/UI. Entrevista al usuario con /grill-me, selecciona la mejor Skill o MCP activa, ejecuta la inspección visual en navegador con /browser y realiza auto-corrección visual obligatoria.
---

# /ui-orchestrator — Workspace Skill

Cuando el usuario invoque esta habilidad, ejecuta este flujo paso a paso:

1. **Entrevista de Alineación (/grill-me)**:
   - Aplica Inversión de Control con /grill-me haciendo de 2 a 3 preguntas breves para entender la prioridad actual (ej. ¿es revisión de accesibilidad/Thumb Zone a 390px, ajuste estético de Liquid Glass, rendimiento LCP o maquetación?).

2. **Diagnóstico y Selección de Herramienta**:
   - Revisa `.atl/skill-registry.md` y las Skills/MCPs instalados (`a11y-debugging`, `chrome-devtools`, `debug-optimize-lcp`, `stitch` o las reglas mandatorias de GEMINI.md/AGENTS.md).
   - Determina cuál es la mejor herramienta para el caso y notifícala al usuario.

3. **Ejecución Visual en Navegador (/browser)**:
   - Lanza `/browser` en la URL del proyecto activo (ej. http://localhost:5173 o puerto actual).
   - Simula la vista móvil a 390px.
   - Toma capturas de pantalla de la interfaz en estado de reposo y durante interacciones activas (modales, menús flotantes, scroll).

4. **Verificación Visual Estricta y Auto-Corrección Obligatoria (Loop de Calidad)**:
   - **Análisis crítico de la imagen:** No asumas que el código es correcto; analiza minuciosamente la captura:
     * ¿Se ve genuinamente bien y pulido el diseño?
     * ¿Hay artefactos visuales, cortes planos dentro de círculos, halos deformes o sombras sucias?
     * ¿Hay solapamientos, cortes o colisiones de bordes con el TabBar flotante o Speed Dial?
     * ¿El contraste WCAG y la jerarquía tipográfica son nítidos?
   - **Auto-Corrección Inmediata:** Si detectas cualquier imperfección visual, artefacto o desfase:
     * Modifica el código de inmediato para solucionarlo.
     * Vuelve a generar la captura en el navegador y comprueba que quedó corregido.
     * Repite el ciclo hasta que el resultado sea visualmente impecable antes de entregar la respuesta.

5. **Reporte Final con Evidencia Visual**:
   - Entrega un resumen claro con las capturas antes/después analizadas y los ajustes aplicados.
