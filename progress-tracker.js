#!/usr/bin/env node

/**
 * Progress Tracker Script for Refactor Plan
 * 
 * Usage:
 *   node progress-tracker.js --help
 *   node progress-tracker.js status
 *   node progress-tracker.js update-task 1.1 completed
 *   node progress-tracker.js update-phase 1 in_progress
 *   node progress-tracker.js update-functionality 2 completed
 *   node progress-tracker.js add-hours 1.1 4
 *   node progress-tracker.js set-blocker "Firebase rules need update"
 *   node progress-tracker.js report
 */

const fs = require('fs');
const path = require('path');

const PLAN_FILE = './refactor-plan.json';

class ProgressTracker {
    constructor() {
        this.loadPlan();
    }

    loadPlan() {
        try {
            const planData = fs.readFileSync(PLAN_FILE, 'utf8');
            this.plan = JSON.parse(planData);
        } catch (error) {
            console.error('❌ Error loading refactor-plan.json:', error.message);
            process.exit(1);
        }
    }

    savePlan() {
        try {
            const updatedPlan = JSON.stringify(this.plan, null, 2);
            fs.writeFileSync(PLAN_FILE, updatedPlan);
            this.updateProgress();
            console.log('✅ Plan updated successfully!');
        } catch (error) {
            console.error('❌ Error saving plan:', error.message);
        }
    }

    updateProgress() {
        // Calculate overall progress
        let totalTasks = 0;
        let completedTasks = 0;
        let totalHours = 0;
        let completedHours = 0;

        this.plan.implementation_phases.forEach(phase => {
            phase.tasks.forEach(task => {
                totalTasks++;
                totalHours += task.estimated_hours;
                
                if (task.status === 'completed') {
                    completedTasks++;
                    // Use actual_hours if available, otherwise fall back to estimated_hours
                    completedHours += task.actual_hours || task.estimated_hours;
                }
            });
        });

        // Update tracking section
        this.plan.tracking.total_estimated_hours = totalHours;
        this.plan.tracking.completed_hours = completedHours;
        this.plan.tracking.remaining_hours = totalHours - completedHours;
        this.plan.tracking.progress_percentage = Math.round((completedTasks / totalTasks) * 100);
        this.plan.tracking.last_updated = new Date().toISOString().split('T')[0];

        // Find next milestone
        const nextPhase = this.plan.implementation_phases.find(phase => 
            phase.status === 'pending' || phase.status === 'in_progress'
        );
        this.plan.tracking.next_milestone = nextPhase ? 
            `Fase ${nextPhase.phase} - ${nextPhase.name}` : 
            'Proyecto Completado';
    }

    // Commands
    showStatus() {
        // Update progress before showing status
        this.updateProgress();
        
        console.log('\n📊 ESTADO ACTUAL DEL PROYECTO\n');
        console.log(`Progreso General: ${this.plan.tracking.progress_percentage}%`);
        console.log(`Horas Completadas: ${this.plan.tracking.completed_hours}/${this.plan.tracking.total_estimated_hours}`);
        console.log(`Próximo Milestone: ${this.plan.tracking.next_milestone}`);
        console.log(`Última Actualización: ${this.plan.tracking.last_updated}\n`);

        console.log('🎯 FASES:');
        this.plan.implementation_phases.forEach(phase => {
            const statusIcon = this.getStatusIcon(phase.status);
            const completedTasks = phase.tasks.filter(t => t.status === 'completed').length;
            console.log(`  ${statusIcon} Fase ${phase.phase}: ${phase.name} (${completedTasks}/${phase.tasks.length} tareas)`);
        });

        console.log('\n📋 FUNCIONALIDADES SRS:');
        this.plan.srs_mapping.functionalities.forEach(func => {
            const statusIcon = this.getStatusIcon(func.status);
            console.log(`  ${statusIcon} ${func.srs_id}. ${func.name}`);
        });

        if (this.plan.tracking.blockers && this.plan.tracking.blockers.length > 0) {
            console.log('\n🚫 BLOCKERS:');
            this.plan.tracking.blockers.forEach(blocker => {
                const description = typeof blocker === 'string' ? blocker : blocker.description;
                const date = typeof blocker === 'object' && blocker.created ? ` (${blocker.created})` : '';
                console.log(`  ⚠️  ${description}${date}`);
            });
        }
    }

    updateTask(taskId, status) {
        let taskFound = false;
        
        this.plan.implementation_phases.forEach(phase => {
            phase.tasks.forEach(task => {
                if (task.id === taskId) {
                    const oldStatus = task.status;
                    task.status = status;
                    taskFound = true;
                    console.log(`✅ Tarea ${taskId} actualizada: ${oldStatus} → ${status}`);
                }
            });
        });

        if (!taskFound) {
            console.log(`❌ Tarea ${taskId} no encontrada`);
            return;
        }

        this.savePlan();
    }

    updatePhase(phaseNumber, status) {
        const phase = this.plan.implementation_phases.find(p => p.phase === parseInt(phaseNumber));
        
        if (!phase) {
            console.log(`❌ Fase ${phaseNumber} no encontrada`);
            return;
        }

        const oldStatus = phase.status;
        phase.status = status;
        console.log(`✅ Fase ${phaseNumber} actualizada: ${oldStatus} → ${status}`);
        
        this.savePlan();
    }

    updateFunctionality(srsId, status) {
        const func = this.plan.srs_mapping.functionalities.find(f => f.srs_id === parseInt(srsId));
        
        if (!func) {
            console.log(`❌ Funcionalidad SRS ${srsId} no encontrada`);
            return;
        }

        const oldStatus = func.status;
        func.status = status;
        console.log(`✅ Funcionalidad ${srsId} (${func.name}) actualizada: ${oldStatus} → ${status}`);
        
        this.savePlan();
    }

    addHours(taskId, hours) {
        let taskFound = false;
        
        this.plan.implementation_phases.forEach(phase => {
            phase.tasks.forEach(task => {
                if (task.id === taskId) {
                    if (!task.actual_hours) task.actual_hours = 0;
                    task.actual_hours += parseInt(hours);
                    taskFound = true;
                    console.log(`✅ Agregadas ${hours} horas a tarea ${taskId}. Total: ${task.actual_hours}h`);
                }
            });
        });

        if (!taskFound) {
            console.log(`❌ Tarea ${taskId} no encontrada`);
            return;
        }

        this.savePlan();
    }

    setBlocker(description) {
        if (!this.plan.tracking.blockers) {
            this.plan.tracking.blockers = [];
        }
        
        this.plan.tracking.blockers.push({
            description,
            created: new Date().toISOString().split('T')[0]
        });
        
        console.log(`⚠️ Blocker agregado: ${description}`);
        this.savePlan();
    }

    removeBlocker(index) {
        if (!this.plan.tracking.blockers || index >= this.plan.tracking.blockers.length) {
            console.log(`❌ Blocker ${index} no encontrado`);
            return;
        }

        const removed = this.plan.tracking.blockers.splice(index, 1);
        console.log(`✅ Blocker removido: ${removed[0].description}`);
        this.savePlan();
    }

    generateReport() {
        // Update progress before generating report
        this.updateProgress();
        
        console.log('\n📈 REPORTE DETALLADO DE PROGRESO\n');
        
        // Overall stats
        const totalTasks = this.plan.implementation_phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
        const completedTasks = this.plan.implementation_phases.reduce((sum, phase) => 
            sum + phase.tasks.filter(t => t.status === 'completed').length, 0);
        const inProgressTasks = this.plan.implementation_phases.reduce((sum, phase) => 
            sum + phase.tasks.filter(t => t.status === 'in_progress').length, 0);

        console.log(`📊 Resumen General:`);
        console.log(`   Tareas Completadas: ${completedTasks}/${totalTasks} (${Math.round(completedTasks/totalTasks*100)}%)`);
        console.log(`   Tareas en Progreso: ${inProgressTasks}`);
        console.log(`   Horas Estimadas: ${this.plan.tracking.total_estimated_hours}h`);
        console.log(`   Horas Completadas: ${this.plan.tracking.completed_hours}h`);

        // Phase breakdown
        console.log(`\n🎯 Desglose por Fases:`);
        this.plan.implementation_phases.forEach(phase => {
            const completed = phase.tasks.filter(t => t.status === 'completed').length;
            const inProgress = phase.tasks.filter(t => t.status === 'in_progress').length;
            const total = phase.tasks.length;
            const statusIcon = this.getStatusIcon(phase.status);
            
            console.log(`   ${statusIcon} Fase ${phase.phase}: ${phase.name}`);
            console.log(`      Tareas: ${completed} completadas, ${inProgress} en progreso, ${total - completed - inProgress} pendientes`);
            
            phase.tasks.forEach(task => {
                const taskIcon = this.getStatusIcon(task.status);
                const actualHours = task.actual_hours ? ` (${task.actual_hours}h reales)` : '';
                console.log(`      ${taskIcon} ${task.id}: ${task.name} - ${task.estimated_hours}h${actualHours}`);
            });
            console.log('');
        });

        // SRS Mapping
        console.log(`📋 Estado de Funcionalidades SRS:`);
        this.plan.srs_mapping.functionalities.forEach(func => {
            const icon = this.getStatusIcon(func.status);
            console.log(`   ${icon} ${func.srs_id}. ${func.name} - ${func.status}`);
        });

        if (this.plan.tracking.blockers && this.plan.tracking.blockers.length > 0) {
            console.log(`\n🚫 Blockers Activos:`);
            this.plan.tracking.blockers.forEach((blocker, index) => {
                console.log(`   ${index}. ${blocker.description} (${blocker.created})`);
            });
        }
    }

    getStatusIcon(status) {
        const icons = {
            'completed': '✅',
            'in_progress': '🔄', 
            'pending': '⏳',
            'implemented_needs_enhancement': '🔧',
            'needs_implementation': '📋',
            'needs_refactor': '🔄',
            'blocked': '🚫'
        };
        return icons[status] || '❓';
    }

    showHelp() {
        console.log(`
🛠️  PROGRESS TRACKER - Sistema de Ventas y Sorteos

COMANDOS DISPONIBLES:

📊 Consultar Estado:
   node progress-tracker.js status              - Estado general del proyecto
   node progress-tracker.js report              - Reporte detallado
   node progress-tracker.js sync                - Sincronizar y guardar progreso

✅ Actualizar Progreso:
   node progress-tracker.js update-task <id> <status>     - Actualizar tarea
   node progress-tracker.js update-phase <num> <status>   - Actualizar fase  
   node progress-tracker.js update-functionality <id> <status> - Actualizar funcionalidad SRS

⏱️  Tracking de Tiempo:
   node progress-tracker.js add-hours <task-id> <hours>   - Agregar horas trabajadas

🚫 Gestión de Blockers:
   node progress-tracker.js set-blocker "<descripción>"   - Agregar blocker
   node progress-tracker.js remove-blocker <index>        - Remover blocker

ESTADOS VÁLIDOS:
   pending, in_progress, completed, blocked, 
   needs_implementation, needs_refactor, implemented_needs_enhancement

EJEMPLOS:
   node progress-tracker.js update-task 1.1 completed
   node progress-tracker.js update-phase 1 in_progress  
   node progress-tracker.js add-hours 1.1 4
   node progress-tracker.js set-blocker "Necesita configurar Firebase rules"
        `);
    }
}

// Main execution
function main() {
    const tracker = new ProgressTracker();
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === 'help') {
        tracker.showHelp();
        return;
    }

    const command = args[0];

    switch (command) {
        case 'status':
            tracker.showStatus();
            break;
            
        case 'update-task':
            if (args.length < 3) {
                console.log('❌ Uso: update-task <task-id> <status>');
                return;
            }
            tracker.updateTask(args[1], args[2]);
            break;
            
        case 'update-phase':
            if (args.length < 3) {
                console.log('❌ Uso: update-phase <phase-number> <status>');
                return;
            }
            tracker.updatePhase(args[1], args[2]);
            break;
            
        case 'update-functionality':
            if (args.length < 3) {
                console.log('❌ Uso: update-functionality <srs-id> <status>');
                return;
            }
            tracker.updateFunctionality(args[1], args[2]);
            break;
            
        case 'add-hours':
            if (args.length < 3) {
                console.log('❌ Uso: add-hours <task-id> <hours>');
                return;
            }
            tracker.addHours(args[1], args[2]);
            break;
            
        case 'set-blocker':
            if (args.length < 2) {
                console.log('❌ Uso: set-blocker "<description>"');
                return;
            }
            tracker.setBlocker(args.slice(1).join(' '));
            break;
            
        case 'remove-blocker':
            if (args.length < 2) {
                console.log('❌ Uso: remove-blocker <index>');
                return;
            }
            tracker.removeBlocker(parseInt(args[1]));
            break;
            
        case 'report':
            tracker.generateReport();
            break;
            
        case 'sync':
            tracker.updateProgress();
            tracker.savePlan();
            console.log('✅ Progress synchronized and saved!');
            break;
            
        default:
            console.log(`❌ Comando desconocido: ${command}`);
            tracker.showHelp();
    }
}

if (require.main === module) {
    main();
}

module.exports = ProgressTracker;
