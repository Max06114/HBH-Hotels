import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Save, FileText } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContentSettings = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [introText, setIntroText] = useState({ text_de: '', text_en: '' });

  const fetchIntroText = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings/intro-text`);
      setIntroText(response.data);
    } catch (error) {
      console.error('Error fetching intro text:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntroText();
  }, [fetchIntroText]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/intro-text`, introText, { headers: getAuthHeaders() });
      toast.success(language === 'de' ? 'Text gespeichert!' : 'Text saved!');
    } catch (error) {
      toast.error(language === 'de' ? 'Fehler beim Speichern' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#6B1D2A]" /></div>;
  }

  return (
    <div data-testid="admin-content-settings" className="space-y-6">
      <h1 className="font-serif text-3xl text-[#1A1A1A]">
        {language === 'de' ? 'Inhalte bearbeiten' : 'Edit Content'}
      </h1>

      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6B1D2A]" />
            {language === 'de' ? 'Intro-Text auf der Startseite' : 'Homepage Intro Text'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Deutsch</Label>
            <Textarea
              value={introText.text_de}
              onChange={(e) => setIntroText({ ...introText, text_de: e.target.value })}
              rows={6}
              className="mt-2"
              placeholder="Intro-Text auf Deutsch..."
              data-testid="intro-text-de"
            />
          </div>
          
          <div>
            <Label className="text-base font-semibold">English</Label>
            <Textarea
              value={introText.text_en}
              onChange={(e) => setIntroText({ ...introText, text_en: e.target.value })}
              rows={6}
              className="mt-2"
              placeholder="Intro text in English..."
              data-testid="intro-text-en"
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#6B1D2A] hover:bg-[#8A2536]"
            data-testid="save-intro-text-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {language === 'de' ? 'Speichern' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            <strong>{language === 'de' ? 'Hinweis:' : 'Note:'}</strong>{' '}
            {language === 'de' 
              ? 'Dieser Text wird auf der Startseite unter der Überschrift "Unsere Partnerhotels" angezeigt.'
              : 'This text is displayed on the homepage under the "Our Partner Hotels" heading.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentSettings;
