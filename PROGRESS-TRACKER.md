# 📊 Progress Tracker - Sistema de Ventas y Sorteos

Este script te permite hacer seguimiento del progreso del refactor del sistema de ventas, basado en el plan definido en `refactor-plan.json`.

## 🚀 Instalación

El script ya está listo para usar. Solo necesitas tener Node.js instalado.

## 📋 Comandos Principales

### Consultar Estado
```bash
# Estado general del proyecto
npm run status
# o
node progress-tracker.js status

# Reporte detallado
npm run report  
# o
node progress-tracker.js report
```

### Actualizar Progreso
```bash
# Actualizar una tarea específica
node progress-tracker.js update-task 1.1 completed
node progress-tracker.js update-task 2.3 in_progress

# Actualizar una fase completa
node progress-tracker.js update-phase 1 completed
node progress-tracker.js update-phase 2 in_progress

# Actualizar funcionalidad del SRS
node progress-tracker.js update-functionality 2 completed
node progress-tracker.js update-functionality 5 in_progress
```

### Tracking de Tiempo
```bash
# Agregar horas trabajadas a una tarea
node progress-tracker.js add-hours 1.1 4
node progress-tracker.js add-hours 2.2 2
```

### Gestión de Blockers
```bash
# Agregar un blocker
node progress-tracker.js set-blocker "Necesita configurar Firebase rules"
node progress-tracker.js set-blocker "Esperando diseño de UI"

# Remover un blocker (por índice mostrado en status)
node progress-tracker.js remove-blocker 0
```

## 📊 Estados Válidos

- **`pending`** - Pendiente de iniciar
- **`in_progress`** - En progreso actualmente  
- **`completed`** - Completado
- **`blocked`** - Bloqueado por algún impedimento
- **`needs_implementation`** - Necesita ser implementado desde cero
- **`needs_refactor`** - Existe pero necesita refactorización
- **`implemented_needs_enhancement`** - Implementado pero necesita mejoras

## 🎯 Ejemplos de Uso Típico

### Al iniciar una nueva fase:
```bash
node progress-tracker.js update-phase 1 in_progress
node progress-tracker.js update-task 1.1 in_progress
```

### Durante el desarrollo:
```bash
# Registrar tiempo trabajado
node progress-tracker.js add-hours 1.1 3

# Marcar tarea completada
node progress-tracker.js update-task 1.1 completed

# Iniciar siguiente tarea
node progress-tracker.js update-task 1.2 in_progress
```

### Al encontrar un blocker:
```bash
node progress-tracker.js set-blocker "Necesita revisar reglas de Firestore antes de continuar"
node progress-tracker.js update-task 1.2 blocked
```

### Al resolver un blocker:
```bash
node progress-tracker.js remove-blocker 0
node progress-tracker.js update-task 1.2 in_progress
```

### Al completar una funcionalidad del SRS:
```bash
node progress-tracker.js update-functionality 3 completed
```

## 📈 Interpretando los Reportes

### Status General
- **Progreso General**: Porcentaje de tareas completadas
- **Horas Completadas**: Horas trabajadas vs. estimadas
- **Próximo Milestone**: Siguiente fase a completar
- **Fases**: Estado de cada fase con contador de tareas
- **Funcionalidades SRS**: Estado de las 9 funcionalidades requeridas
- **Blockers**: Impedimentos activos con fecha

### Reporte Detallado
- **Resumen General**: Estadísticas globales del proyecto
- **Desglose por Fases**: Detalle de cada fase y sus tareas
- **Estado SRS**: Mapeo con las funcionalidades originales
- **Blockers Activos**: Lista detallada de impedimentos

## 🔧 Personalización

Puedes modificar el archivo `refactor-plan.json` directamente para:
- Agregar nuevas tareas
- Modificar estimaciones de tiempo
- Cambiar descripciones
- Agregar nuevas fases

El script automáticamente recalculará las métricas basándose en los cambios.

## 📁 Archivos Relacionados

- **`refactor-plan.json`** - Plan maestro con toda la información
- **`progress-tracker.js`** - Script de seguimiento
- **`package.json`** - Scripts npm configurados

## 🎪 Tips de Uso

1. **Usa el script frecuentemente** para mantener el tracking actualizado
2. **Registra las horas reales** para mejorar estimaciones futuras
3. **Documenta los blockers** para hacer seguimiento de impedimentos
4. **Genera reportes semanales** para reviews de progreso
5. **Actualiza inmediatamente** cuando completes tareas para mantener moral alta

## 🚀 Workflow Recomendado

```bash
# Al iniciar el día
npm run status

# Al iniciar una tarea
node progress-tracker.js update-task X.X in_progress

# Al trabajar en la tarea (registrar tiempo cada 2-3 horas)
node progress-tracker.js add-hours X.X 2

# Al completar la tarea
node progress-tracker.js update-task X.X completed

# Al finalizar el día
npm run status

# Al finalizar la semana
npm run report
```

¡Happy coding! 🎯
