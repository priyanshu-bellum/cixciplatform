import TextField, { type TextFieldProps } from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

type SearchBarProps = Omit<TextFieldProps, 'variant'> & {
  onSearch?: (value: string) => void;
};

export default function SearchBar({ onSearch, ...props }: SearchBarProps) {
  return (
    <TextField
      {...props}
      size="small"
      placeholder={props.placeholder ?? 'Search...'}
      onChange={(e) => {
        props.onChange?.(e);
        onSearch?.(e.target.value);
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        },
      }}
      sx={{ minWidth: 220, ...props.sx }}
    />
  );
}
