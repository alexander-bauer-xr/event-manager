import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggle = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
  };

  return (
    <button onClick={toggle} className="language-switcher">
      {i18n.language === 'de' ? 'EN' : 'DE'}
    </button>
  );
}
