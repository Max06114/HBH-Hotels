import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Loader2, Save, FileText, Code } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContentSettings = () => {
  const { language } = useLanguage();
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [introText, setIntroText] = useState({ text_de: '', text_en: '' });
  const [showPreview, setShowPreview] = useState(false);

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

      {/* HTML Help Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
            <Code className="w-5 h-5" />
            {language === 'de' ? 'HTML-Formatierung' : 'HTML Formatting'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 text-sm mb-3">
            {language === 'de' 
              ? 'Sie können HTML-Befehle für die Formatierung verwenden:' 
              : 'You can use HTML commands for formatting:'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono bg-white p-3 rounded border border-amber-200">
            <div><code>&lt;strong&gt;Fett&lt;/strong&gt;</code> → <strong>Fett</strong></div>
            <div><code>&lt;em&gt;Kursiv&lt;/em&gt;</code> → <em>Kursiv</em></div>
            <div><code>&lt;u&gt;Unterstrichen&lt;/u&gt;</code> → <u>Unterstrichen</u></div>
            <div><code>&lt;br&gt;</code> → Zeilenumbruch</div>
            <div><code>&lt;a href="URL"&gt;Link&lt;/a&gt;</code> → <a href="#" className="text-[#6B1D2A] underline">Link</a></div>
            <div><code>&lt;p&gt;Absatz&lt;/p&gt;</code> → Absatz</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E5E0D5]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6B1D2A]" />
            {language === 'de' ? 'Intro-Text auf der Startseite' : 'Homepage Intro Text'}
          </CardTitle>
          <CardDescription>
            {language === 'de' 
              ? 'Dieser Text wird unter "Unsere Partnerhotels" angezeigt. HTML-Formatierung ist möglich.'
              : 'This text is displayed under "Our Partner Hotels". HTML formatting is supported.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Deutsch</Label>
            <Textarea
              value={introText.text_de}
              onChange={(e) => setIntroText({ ...introText, text_de: e.target.value })}
              rows={8}
              className="mt-2 font-mono text-sm"
              placeholder="Intro-Text auf Deutsch... (HTML erlaubt)"
              data-testid="intro-text-de"
            />
          </div>
          
          <div>
            <Label className="text-base font-semibold">English</Label>
            <Textarea
              value={introText.text_en}
              onChange={(e) => setIntroText({ ...introText, text_en: e.target.value })}
              rows={8}
              className="mt-2 font-mono text-sm"
              placeholder="Intro text in English... (HTML allowed)"
              data-testid="intro-text-en"
            />
          </div>

          {/* Preview Toggle */}
          <div className="border-t pt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPreview(!showPreview)}
              className="mb-4"
            >
              {showPreview 
                ? (language === 'de' ? 'Vorschau ausblenden' : 'Hide Preview')
                : (language === 'de' ? 'Vorschau anzeigen' : 'Show Preview')}
            </Button>
            
            {showPreview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">Deutsch - Vorschau:</Label>
                  <div 
                    className="p-4 bg-[#F5F2EA] rounded-lg text-[#4A4A4A] leading-relaxed text-sm [&_a]:text-[#6B1D2A] [&_a]:underline [&_strong]:text-[#1A1A1A]"
                    dangerouslySetInnerHTML={{ __html: introText.text_de || '<em>Kein Text</em>' }}
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">English - Preview:</Label>
                  <div 
                    className="p-4 bg-[#F5F2EA] rounded-lg text-[#4A4A4A] leading-relaxed text-sm [&_a]:text-[#6B1D2A] [&_a]:underline [&_strong]:text-[#1A1A1A]"
                    dangerouslySetInnerHTML={{ __html: introText.text_en || '<em>No text</em>' }}
                  />
                </div>
              </div>
            )}
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
    </div>
  );
};

export default ContentSettings;
