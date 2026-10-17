import Typography from '@mui/material/Typography';
import type { TypographyProps } from '@mui/material/Typography';
import { MONO_FONT } from '../../theme/typography';

export default function MonoText(props: TypographyProps) {
  return <Typography {...props} sx={{ fontFamily: MONO_FONT, ...props.sx }} />;
}
