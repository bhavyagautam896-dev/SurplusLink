import React, { useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';
import { ShieldAlert, PlusCircle } from 'lucide-react';

interface PostListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultLat?: number;
  defaultLng?: number;
}

const COMMON_FOOD_TYPES = [
  'Cooked Rice & Dal',
  'Buffet Paneer Masala & Rotis',
  'Assorted Bakery Bread & Rolls',
  'Mixed Vegetable Pulao',
  'Packed Lunch Boxes',
  'South Indian Idli & Sambar',
  'Fresh Fruit & Green Salad',
  'Snack Assortment & Sandwiches',
];

export const PostListingModal: React.FC<PostListingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultLat = 21.1458,
  defaultLng = 79.0882,
}) => {
  const [foodType, setFoodType] = useState(COMMON_FOOD_TYPES[0]);
  const [description, setDescription] = useState('');
  const [quantityKg, setQuantityKg] = useState<number>(20);

  // Set default safe-until 4 hours from now
  const defaultFutureTime = new Date(Date.now() + 4 * 3600 * 1000);
  // Format for datetime-local: YYYY-MM-DDTHH:mm
  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [safeUntil, setSafeUntil] = useState(formatDateTimeLocal(defaultFutureTime));
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [latitude, setLatitude] = useState(defaultLat);
  const [longitude, setLongitude] = useState(defaultLng);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const safeUntilDate = new Date(safeUntil);
    if (isNaN(safeUntilDate.getTime()) || safeUntilDate.getTime() <= Date.now()) {
      setError('Safe-until timestamp must be in the future.');
      return;
    }

    if (quantityKg <= 0) {
      setError('Food quantity must be greater than zero kg.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/listings', {
        foodType,
        description,
        quantityKg: Number(quantityKg),
        safeUntil: safeUntilDate.toISOString(),
        pickupInstructions: pickupInstructions || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post Surplus Food for Rescue" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Food Safety Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p leading-relaxed>
            <strong>Food Safety Responsibility:</strong> Donors remain responsible for ensuring
            that surplus food has been kept at safe temperatures and remains fit for human consumption
            until the safe-until timestamp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Food Category
            </label>
            <select
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
            >
              {COMMON_FOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Quantity (kg)"
            type="number"
            step="0.5"
            min="0.5"
            value={quantityKg}
            onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Food Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Details on food preparation, ingredients, packaging, or serving size..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Safe Until (Expiry Window)
            </label>
            <input
              type="datetime-local"
              value={safeUntil}
              min={formatDateTimeLocal(new Date())}
              onChange={(e) => setSafeUntil(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Latest safe pickup time before food must not be consumed.
            </p>
          </div>

          <Input
            label="Pickup Instructions (Optional)"
            value={pickupInstructions}
            onChange={(e) => setPickupInstructions(e.target.value)}
            placeholder="e.g. Backdoor loading dock, bring containers"
          />
        </div>

        {/* Location Picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pickup Location Coordinates
          </label>
          <LocationPickerMap
            initialLat={latitude}
            initialLng={longitude}
            onLocationSelect={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Publish Surplus Food Listing
          </Button>
        </div>
      </form>
    </Modal>
  );
};
