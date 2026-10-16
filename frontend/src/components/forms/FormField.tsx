import TextField, { type TextFieldProps } from '@mui/material/TextField';

type FormFieldProps = TextFieldProps & {
  errorMessage?: string;
};

export default function FormField({ errorMessage, ...props }: FormFieldProps) {
  return (
    <TextField
      {...props}
      error={!!errorMessage || props.error}
      helperText={errorMessage ?? props.helperText}
      fullWidth={props.fullWidth ?? true}
      size={props.size ?? 'small'}
    />
  );
}
