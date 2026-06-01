import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../ui/card';
import { Image as ImageIcon, Upload, ExternalLink } from 'lucide-react';

const ImageManager = () => {
  const { language } = useLanguage();
  
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-[#1A1A1A] mb-6">
        {language === 'de' ? 'Bildmanager' : 'Image Manager'}
      </h1>
      
      {/* Current Solution */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <ImageIcon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">
                {language === 'de' ? 'Aktuelle Lösung: Statische Bilder' : 'Current Solution: Static Images'}
              </h3>
              <p className="text-amber-700 mt-1">
                {language === 'de' 
                  ? 'Bilder werden als statische Dateien im GitHub Repository verwaltet (/frontend/public/images/hotels/). Nach dem Hinzufügen neuer Bilder muss ein Deployment ausgelöst werden.'
                  : 'Images are managed as static files in the GitHub repository (/frontend/public/images/hotels/). After adding new images, a deployment must be triggered.'}
              </p>
              <a 
                href="https://github.com/Max06114/HBH-Hotels/tree/main/frontend/public/images/hotels" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-amber-800 hover:text-amber-900 font-medium"
              >
                GitHub Repository öffnen
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Solution */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800">
                {language === 'de' ? 'Zukünftige Lösung: Cloud Storage' : 'Future Solution: Cloud Storage'}
              </h3>
              <p className="text-blue-700 mt-1">
                {language === 'de' 
                  ? 'Um Bilder direkt über dieses Dashboard hochladen zu können, wird ein Cloud-Storage-Dienst benötigt. Empfohlene Optionen:'
                  : 'To upload images directly through this dashboard, a cloud storage service is needed. Recommended options:'}
              </p>
              <ul className="text-blue-700 mt-2 space-y-1 text-sm">
                <li>• <strong>Cloudinary</strong> - {language === 'de' ? 'Kostenlos bis 25GB, einfache Integration' : 'Free up to 25GB, easy integration'}</li>
                <li>• <strong>AWS S3</strong> - {language === 'de' ? 'Ca. 1€/Monat, sehr zuverlässig' : 'About €1/month, very reliable'}</li>
                <li>• <strong>Vercel Blob</strong> - {language === 'de' ? 'Native Vercel-Integration' : 'Native Vercel integration'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageManager;
