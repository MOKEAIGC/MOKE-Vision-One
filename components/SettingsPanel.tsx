import React from 'react';
import { CameraSettings } from '../types';
import { QuantumSlider, QuantumSelector, QuantumInput } from './UIComponents';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsPanelProps {
  settings: CameraSettings;
  updateSettings: (newSettings: Partial<CameraSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  
  const handleLensChange = (type: string) => {
    const lensType = type as 'STANDARD' | 'MACRO' | 'PROBE' | 'STORYBOARD';
    let newSettings: Partial<CameraSettings> = { lensType };

    if (lensType === 'MACRO') {
      newSettings = { ...newSettings, focalLength: 100, aperture: 2.8, focusDistance: 10 };
    } else if (lensType === 'PROBE') {
      newSettings = { ...newSettings, focalLength: 24, aperture: 14, focusDistance: 2 };
    } else if (lensType === 'STORYBOARD') {
      newSettings = { ...newSettings, focalLength: 35, aperture: 4.0, aspectRatio: '16:9' };
    } else {
      newSettings = { ...newSettings, focalLength: 50, aperture: 1.8, focusDistance: 50 };
    }
    
    updateSettings(newSettings);
  };

  return (
    <div className={`flex flex-col gap-8 p-8 border-t ${isDark ? 'bg-moke-black border-gray-900' : 'bg-white border-gray-200'} transition-colors duration-500`}>
      
      {/* Top Row: Lens & Format */}
      <div className={`flex flex-col gap-8 border-b ${isDark ? 'border-gray-900' : 'border-gray-200'} pb-8`}>
         <QuantumSelector
           label={t('LENS_MOUNT')}
           value={settings.lensType}
           options={['STANDARD', 'MACRO', 'PROBE', 'STORYBOARD']}
           optionLabels={{
             'STANDARD': t('STD'),
             'MACRO': t('MACRO'),
             'PROBE': t('PROBE'),
             'STORYBOARD': t('STORY')
           }}
           onChange={handleLensChange}
         />
         
         <div className="grid grid-cols-2 gap-8">
            <QuantumSelector
              label={t('ASPECT')}
              value={settings.aspectRatio}
              options={["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"]}
              onChange={(v) => updateSettings({ aspectRatio: v })}
            />
            <QuantumSelector
              label={t('RES')}
              value={settings.resolution}
              options={["1K", "2K", "4K"]}
              onChange={(v) => updateSettings({ resolution: v })}
            />
         </div>
      </div>

      {/* Optical Settings */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
        <QuantumSlider
          label={t('FOCAL_LEN')}
          value={settings.focalLength}
          min={10}
          max={400} 
          unit="mm"
          editable={true} 
          onChange={(v) => updateSettings({ focalLength: v })}
        />
        
        <QuantumSlider
          label={t('APERTURE')}
          value={settings.aperture}
          min={0.95}
          max={32}
          step={0.1}
          unit="f"
          editable={true}
          onChange={(v) => updateSettings({ aperture: v })}
        />

        <QuantumSlider
          label={t('ISO')}
          value={settings.iso}
          min={100}
          max={51200}
          step={100}
          editable={true}
          onChange={(v) => updateSettings({ iso: v })}
        />
        
        <QuantumInput
           label={t('SHUTTER')}
           value={settings.shutterSpeed}
           onChange={(v) => updateSettings({ shutterSpeed: v })}
           placeholder="e.g. 1/200"
        />
      </div>
      
      <div className={`flex justify-between items-center text-sm font-mono mt-4 border-t ${isDark ? 'border-gray-900 text-gray-600' : 'border-gray-200 text-gray-500'} pt-6`}>
        <span className="font-bold">{t('STATUS_NORMAL')}</span>
        <span className="text-moke-red font-bold">
            {t('CURRENT_LENS')} {
                settings.lensType === 'STANDARD' ? t('LENS_DESC_STD') : 
                settings.lensType === 'MACRO' ? t('LENS_DESC_MACRO') : 
                settings.lensType === 'PROBE' ? t('LENS_DESC_PROBE') :
                t('LENS_DESC_STORY')
            }
        </span>
      </div>
    </div>
  );
};