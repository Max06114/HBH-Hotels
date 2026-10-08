import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { API } from './utils';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordDialog = ({ open, onClose, language }) => {
  const de = language === 'de';
  const { getAuthHeaders } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setRepeat(''); };
  const strongEnough = next.length >= 10 && /[A-Za-z]/.test(next) && /\d/.test(next);
  const canSave = current && strongEnough && next === repeat && !saving;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/change-password`, { current_password: current, new_password: next }, { headers: getAuthHeaders() });
      toast.success(de ? 'Passwort geändert. Bitte beim nächsten Login das neue Passwort verwenden.' : 'Password changed. Use the new password at your next login.');
      reset();
      onClose();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : (de ? 'Passwort konnte nicht geändert werden' : 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md" data-testid="change-password-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2"><KeyRound className="w-5 h-5 text-[#6B1D2A]" />{de ? 'Passwort ändern' : 'Change password'}</DialogTitle>
          <DialogDescription>{de ? 'Mindestens 10 Zeichen, mit Buchstaben und Ziffern.' : 'At least 10 characters, including letters and digits.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="pw-current">{de ? 'Aktuelles Passwort' : 'Current password'}</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} data-testid="pw-current" />
          </div>
          <div>
            <Label htmlFor="pw-new">{de ? 'Neues Passwort' : 'New password'}</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} data-testid="pw-new" />
            {next && !strongEnough && <p className="text-xs text-red-700 mt-1" data-testid="pw-strength-hint">{de ? 'Zu schwach: mind. 10 Zeichen, Buchstaben und Ziffern.' : 'Too weak: min. 10 characters, letters and digits.'}</p>}
          </div>
          <div>
            <Label htmlFor="pw-repeat">{de ? 'Neues Passwort wiederholen' : 'Repeat new password'}</Label>
            <Input id="pw-repeat" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} data-testid="pw-repeat" />
            {repeat && next !== repeat && <p className="text-xs text-red-700 mt-1" data-testid="pw-mismatch-hint">{de ? 'Passwörter stimmen nicht überein.' : 'Passwords do not match.'}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} data-testid="pw-cancel-btn">{de ? 'Abbrechen' : 'Cancel'}</Button>
          <Button onClick={handleSave} disabled={!canSave} className="bg-[#6B1D2A] hover:bg-[#8A2536] text-white" data-testid="pw-save-btn">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {de ? 'Passwort speichern' : 'Save password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
