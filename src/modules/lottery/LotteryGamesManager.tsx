/**
 * LotteryGamesManager.tsx
 * UI component for supervisors to manage lottery game types
 * Allows creating, editing, deleting, reordering, and toggling active status
 */

import React, { useState, useEffect } from 'react'
import { useCachedLotteryGames } from '../../hooks/useCachedLotteryGames'
import { LotteryGame } from '../../services/LotteryGamesService'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export const LotteryGamesManager: React.FC = () => {
  const { games, loading, error, create, update, remove, reorder, toggleActive, refresh } = useCachedLotteryGames()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<LotteryGame | null>(null)
  const [form, setForm] = useState({
    name: '',
    isActive: true,
    displayOrder: 0
  })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Reset form when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setForm({ name: '', isActive: true, displayOrder: 0 })
      setEditingGame(null)
    }
  }, [isModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.name.trim()) {
      return alert('Por favor ingresa el nombre del juego')
    }

    try {
      if (editingGame?.id) {
        await update(editingGame.id, {
          name: form.name,
          isActive: form.isActive
        })
      } else {
        await create({
          name: form.name,
          isActive: form.isActive,
          displayOrder: games.length // Add to end
        })
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'No se pudo guardar'}`)
    }
  }

  const handleEdit = (game: LotteryGame) => {
    setEditingGame(game)
    setForm({
      name: game.name,
      isActive: game.isActive,
      displayOrder: game.displayOrder
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?\n\nEsto podría afectar reportes históricos.`)) return
    
    try {
      await remove(id)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'No se pudo eliminar'}`)
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'No se pudo cambiar el estado'}`)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const reorderedGames = [...games]
    const draggedGame = reorderedGames[draggedIndex]
    reorderedGames.splice(draggedIndex, 1)
    reorderedGames.splice(index, 0, draggedGame)

    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    
    try {
      const gameIds = games.map(g => g.id!)
      await reorder(gameIds)
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'No se pudo reordenar'}`)
    } finally {
      setDraggedIndex(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={refresh} className="mt-4">Reintentar</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Juegos de Lotería</h1>
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          + Agregar Juego
        </Button>
      </div>

      <Card className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Instrucciones:</strong> Arrastra los juegos para reordenar. Los juegos inactivos no aparecerán en los formularios de captura.
        </p>
      </Card>

      {games.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-center py-8">
            No hay juegos registrados. Agrega el primer juego.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {games.map((game, index) => (
            <div
              key={game.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="cursor-move"
            >
              <Card
                className={`transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${!game.isActive ? 'bg-gray-50' : ''}`}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <span className="text-gray-400 text-sm">☰</span>
                  <div>
                    <h3 className={`font-semibold ${!game.isActive ? 'text-gray-500' : 'text-gray-800'}`}>
                      {game.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Orden: {game.displayOrder} • {game.isActive ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleToggleActive(game.id!)}
                    variant="secondary"
                    size="sm"
                  >
                    {game.isActive ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                  </Button>
                  <Button
                    onClick={() => handleEdit(game)}
                    variant="secondary"
                    size="sm"
                  >
                    ✏️ Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(game.id!, game.name)}
                    variant="danger"
                    size="sm"
                  >
                    🗑️ Eliminar
                  </Button>
                </div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGame ? 'Editar Juego' : 'Agregar Juego'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Juego *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Melate, Chispazo, Tris"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Juego activo (visible en formularios)
            </label>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" variant="primary" className="flex-1">
              {editingGame ? 'Actualizar' : 'Crear'}
            </Button>
            <Button
              type="button"
              onClick={() => setIsModalOpen(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
