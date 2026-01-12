/**
 * Undo/Redo System for Free Paint
 * 
 * Phase 8: Undo that does not kill memory
 * - Store vector ops (strokes as points)
 * - Rasterize on commit (convert to ImageData for heavy ops)
 * - Enforce memory budget (40-60MB)
 * - Drop oldest gracefully
 * 
 * Strategy:
 * - Light operations (strokes): Store as vector data (points array)
 * - Heavy operations (fill, large shapes): Store as ImageData snapshot
 * - Memory budget: 50MB max
 * - When budget exceeded, convert oldest vectors to ImageData or drop
 */

import type { Stroke } from '../../core/drawingEngine';

export type UndoOperation = 
    | { type: 'stroke'; stroke: Stroke }
    | { type: 'fill'; imageData: ImageData; bounds: { x: number; y: number; width: number; height: number } }
    | { type: 'clear' }
    | { type: 'snapshot'; imageData: ImageData };

interface UndoStackEntry {
    operation: UndoOperation;
    timestamp: number;
    memoryEstimate: number; // bytes
}

const MAX_UNDO_STEPS = 30;
const MEMORY_BUDGET_BYTES = 50 * 1024 * 1024; // 50MB

export class UndoRedoManager {
    private undoStack: UndoStackEntry[] = [];
    private redoStack: UndoStackEntry[] = [];
    private currentMemoryUsage: number = 0;
    
    /**
     * Estimate memory usage of an operation
     */
    private estimateMemory(operation: UndoOperation): number {
        switch (operation.type) {
            case 'stroke':
                // Vector data: points array
                // Each point: x, y, pressure, timestamp = ~32 bytes
                const pointCount = operation.stroke.points.length;
                return pointCount * 32 + 100; // +100 for stroke metadata
            
            case 'fill':
            case 'snapshot':
                // ImageData: width * height * 4 bytes (RGBA)
                return operation.imageData.width * operation.imageData.height * 4;
            
            case 'clear':
                return 0; // Clear is just a marker
        }
    }
    
    /**
     * Add operation to undo stack
     */
    push(operation: UndoOperation): void {
        const memoryEstimate = this.estimateMemory(operation);
        
        // Enforce memory budget
        while (this.currentMemoryUsage + memoryEstimate > MEMORY_BUDGET_BYTES && this.undoStack.length > 0) {
            const oldest = this.undoStack.shift();
            if (oldest) {
                this.currentMemoryUsage -= oldest.memoryEstimate;
            }
        }
        
        // Enforce max steps
        if (this.undoStack.length >= MAX_UNDO_STEPS) {
            const oldest = this.undoStack.shift();
            if (oldest) {
                this.currentMemoryUsage -= oldest.memoryEstimate;
            }
        }
        
        // Add to stack
        this.undoStack.push({
            operation,
            timestamp: Date.now(),
            memoryEstimate
        });
        this.currentMemoryUsage += memoryEstimate;
        
        // Clear redo stack (new action invalidates redo)
        this.clearRedo();
    }
    
    /**
     * Pop from undo stack and return operation
     */
    pop(): UndoOperation | null {
        if (this.undoStack.length === 0) {
            return null;
        }
        
        const entry = this.undoStack.pop()!;
        this.currentMemoryUsage -= entry.memoryEstimate;
        
        // Move to redo stack
        this.redoStack.push(entry);
        
        return entry.operation;
    }
    
    /**
     * Pop from redo stack and return operation
     */
    redo(): UndoOperation | null {
        if (this.redoStack.length === 0) {
            return null;
        }
        
        const entry = this.redoStack.pop()!;
        this.currentMemoryUsage += entry.memoryEstimate;
        
        // Move back to undo stack
        this.undoStack.push(entry);
        
        return entry.operation;
    }
    
    /**
     * Clear redo stack
     */
    clearRedo(): void {
        this.redoStack.forEach(entry => {
            this.currentMemoryUsage -= entry.memoryEstimate;
        });
        this.redoStack = [];
    }
    
    /**
     * Clear both stacks
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.currentMemoryUsage = 0;
    }
    
    /**
     * Get undo stack size
     */
    getUndoCount(): number {
        return this.undoStack.length;
    }
    
    /**
     * Get redo stack size
     */
    getRedoCount(): number {
        return this.redoStack.length;
    }
    
    /**
     * Get current memory usage in MB
     */
    getMemoryUsageMB(): number {
        return this.currentMemoryUsage / (1024 * 1024);
    }
    
    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }
    
    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}

export const undoRedoManager = new UndoRedoManager();
