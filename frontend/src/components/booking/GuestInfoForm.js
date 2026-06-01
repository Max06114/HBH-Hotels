import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const GuestInfoForm = ({ formData, onChange, onSelectChange }) => {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Salutation and Name Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="salutation">{t('salutation')} *</Label>
          <Select value={formData.salutation} onValueChange={(v) => onSelectChange('salutation', v)}>
            <SelectTrigger data-testid="salutation-select">
              <SelectValue placeholder={t('salutation')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Herr">{t('mr')}</SelectItem>
              <SelectItem value="Frau">{t('mrs')}</SelectItem>
              <SelectItem value="Divers">{t('diverse')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="firstName">{t('firstName')} *</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            required
            data-testid="first-name-input"
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t('lastName')} *</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            required
            data-testid="last-name-input"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">{t('email')} *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          required
          data-testid="email-input"
        />
      </div>

      {/* Street */}
      <div>
        <Label htmlFor="street">{t('street')} *</Label>
        <Input
          id="street"
          name="street"
          value={formData.street}
          onChange={onChange}
          required
          data-testid="street-input"
        />
      </div>

      {/* PLZ, City, Country */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="postalCode">{t('postalCode')} *</Label>
          <Input
            id="postalCode"
            name="postalCode"
            value={formData.postalCode}
            onChange={onChange}
            required
            data-testid="postal-code-input"
          />
        </div>
        <div>
          <Label htmlFor="city">{t('city')} *</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={onChange}
            required
            data-testid="city-input"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="country">{t('country')} *</Label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={onChange}
            required
            data-testid="country-input"
          />
        </div>
      </div>
    </div>
  );
};

export default GuestInfoForm;
