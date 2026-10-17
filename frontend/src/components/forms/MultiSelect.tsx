import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

interface MultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({ label, options, value, onChange, placeholder, disabled }: MultiSelectProps) {
  return (
    <Autocomplete<string, true, false, false>
      multiple
      size="small"
      options={options}
      value={value}
      onChange={(_, newVal) => onChange(newVal)}
      disabled={disabled}
      renderValue={(selected, getItemProps) =>
        selected.map((option, index) => (
          <Chip label={option} size="small" {...getItemProps({ index })} key={option} />
        ))
      }
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} />
      )}
    />
  );
}
