import { ExpandMore } from "@mui/icons-material";
import { FormControl, MenuItem, Select } from "@mui/material";
import { useLanguage, type Language } from "../i18n";
const languages = [
  { value: 'en', name: 'English' },
  { value: 'ru', name: 'Русский' },
  { value: 'sr', name: 'Srpski' },
]
export function LanguageSelect() {
  const [language, setLanguage] = useLanguage();
  return (
    <FormControl size="small">
      <Select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        IconComponent={ExpandMore}
        aria-label="Language"
      >
        {languages.map(({value, name}, key) => (<MenuItem value={value} key={key}>{name}</MenuItem>))}
      </Select>
    </FormControl>
  );
}
