import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

export interface SelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: string[] | SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  sx?: Record<string, any>;
}

function isOptionObjects(opts: string[] | SelectOption[]): opts is SelectOption[] {
  return opts.length > 0 && typeof opts[0] === 'object';
}

export default function MultiSelect({ label, options, value, onChange, placeholder, disabled, sx }: MultiSelectProps) {
  const mergedSx = { minWidth: 180, ...sx };
  if (isOptionObjects(options)) {
    const optMap = new Map(options.map(o => [o.value, o.label]));
    return (
      <Autocomplete<SelectOption, true, false, false>
        multiple
        size="small"
        sx={mergedSx}
        options={options}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(opt, val) => opt.value === val.value}
        value={value.map(v => ({ value: v, label: optMap.get(v) ?? v }))}
        onChange={(_, newVal) => onChange(newVal.map(o => o.value))}
        disabled={disabled}
        renderValue={(selected, getItemProps) =>
          selected.map((option, index) => (
            <Chip label={option.label} size="small" {...getItemProps({ index })} key={option.value} />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} label={label} placeholder={placeholder} />
        )}
      />
    );
  }

  return (
    <Autocomplete<string, true, false, false>
      multiple
      size="small"
      sx={mergedSx}
      options={options as string[]}
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
