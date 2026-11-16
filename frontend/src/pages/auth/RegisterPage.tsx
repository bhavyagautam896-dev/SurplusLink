import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';
import { Building2, Users2, UtensilsCrossed } from 'lucide-react';
import { getErrorMessage } from '../../api/client';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<'DONOR' | 'NGO'>('DONOR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Nagpur');
  const [latitude, setLatitude] = useState(21.1458);
  const [longitude, setLongitude] = useState(79.0882);

  // NGO specific
  const [capacityKg, setCapacityKg] = useState<number>(80);
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(15);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        email,
        password,
        role,
        organizationName,
        contactPhone,
        address,
        city,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      if (role === 'NGO') {
        payload.capacityKg = Number(capacityKg);
        payload.serviceRadiusKm = Number(serviceRadiusKm);
        payload.isAccepting = true;
      }

      await register(payload);
      navigate(role === 'DONOR' ? '/donor' : '/ngo');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-forest-800 text-white flex items-center justify-center mx-auto shadow-sm">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Register for SurplusLink
        </h2>
        <p className="text-xs text-slate-500">
          Join the organized surplus food redistribution and rescue network
        </p>
      </div>

      <Card className="p-6">
        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setRole('DONOR')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'DONOR'
                ? 'bg-white text-forest-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Food Donor (Kitchen/Hotel)</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('NGO')}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'NGO'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>Rescue NGO / Charity</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder={role === 'DONOR' ? 'e.g., Royal Palm Caterers' : 'e.g., Roti Bank Foundation'}
              required
            />
            <Input
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98230 00000"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@org.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Physical Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Street, Landmark"
                required
              />
            </div>
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          {/* NGO Specific Parameters */}
          {role === 'NGO' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <Input
                label="Max Pickup Capacity (kg)"
                type="number"
                min="1"
                value={capacityKg}
                onChange={(e) => setCapacityKg(parseFloat(e.target.value) || 0)}
                helperText="Maximum food quantity your transport vehicles can accept in one run"
                required
              />
              <Input
                label="Service Radius (km)"
                type="number"
                min="1"
                max="50"
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(parseFloat(e.target.value) || 0)}
                helperText="Maximum geographical distance from your location you can reach"
                required
              />
            </div>
          )}

          {/* Location Picker Map */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Geographical Coordinates
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

          <Button type="submit" className="w-full mt-4" size="lg" isLoading={loading}>
            Create {role === 'DONOR' ? 'Donor' : 'NGO'} Account
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-slate-500 mt-4">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-forest-700 hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
};
