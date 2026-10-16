import Typography, { TypographyProps } from '@mui/material/Typography';
import { MONO_FONT } from '../../theme/typography';

export default function MonoText(props: TypographyProps) {
  return <Typography {...props} sx={{ fontFamily: MONO_FONT, ...props.sx }} />;
}
